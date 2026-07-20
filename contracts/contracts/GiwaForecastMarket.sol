// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GiwaForecastMarket
 * @notice Binary, testnet-only prediction market using GIWA Playground VerifiedToken as collateral.
 * @dev Users buy internal YES/NO outcome shares. Each winning share redeems for 1 collateral token.
 *      Markets are resolved by a publicly disclosed resolver address after close time.
 *      This contract is intentionally an experimental testnet demo and has not been audited.
 */
contract GiwaForecastMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome {
        YES,
        NO
    }

    struct Market {
        string question;
        string category;
        uint64 closeTime;
        address resolver;
        address creator;
        uint256 yesReserve;
        uint256 noReserve;
        uint256 collateralPool;
        uint256 yesUserShares;
        uint256 noUserShares;
        uint256 winningUserShares;
        bool resolved;
        Outcome resolvedOutcome;
        bool residualClaimed;
    }

    IERC20 public immutable collateralToken;
    address public owner;
    address public feeRecipient;
    uint16 public immutable feeBps;
    uint256 public marketCount;

    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => uint256)) private _yesShares;
    mapping(uint256 => mapping(address => uint256)) private _noShares;
    mapping(uint256 => mapping(address => bool)) public payoutClaimed;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeeRecipientUpdated(address indexed previousRecipient, address indexed newRecipient);
    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        address indexed resolver,
        string question,
        uint64 closeTime,
        uint256 seedLiquidity
    );
    event SharesBought(
        uint256 indexed marketId,
        address indexed trader,
        Outcome indexed outcome,
        uint256 collateralIn,
        uint256 fee,
        uint256 sharesOut
    );
    event SharesSold(
        uint256 indexed marketId,
        address indexed trader,
        Outcome indexed outcome,
        uint256 sharesIn,
        uint256 grossCollateralOut,
        uint256 fee,
        uint256 netCollateralOut
    );
    event MarketResolved(uint256 indexed marketId, Outcome indexed outcome, uint256 winningUserShares);
    event PayoutClaimed(uint256 indexed marketId, address indexed user, uint256 payout);
    event CreatorResidualClaimed(uint256 indexed marketId, address indexed creator, uint256 payout);

    error NotOwner();
    error InvalidAddress();
    error InvalidFee();
    error InvalidMarket();
    error MarketClosed();
    error MarketNotClosed();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error NotResolver();
    error InvalidAmount();
    error InsufficientShares();
    error AlreadyClaimed();
    error NothingToClaim();
    error ResidualAlreadyClaimed();
    error OnlyCreator();
    error InsufficientLiquidity();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address collateralToken_, address feeRecipient_, uint16 feeBps_) {
        if (collateralToken_ == address(0) || feeRecipient_ == address(0)) revert InvalidAddress();
        if (feeBps_ > 500) revert InvalidFee(); // capped at 5% for the testnet demo

        collateralToken = IERC20(collateralToken_);
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        address previous = owner;
        owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidAddress();
        address previous = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(previous, newRecipient);
    }

    /**
     * @notice Create a market and seed its initial AMM liquidity.
     * @param question A clear binary question with an unambiguous resolution rule.
     * @param category UI category such as Crypto, GIWA, Esports, Web3, or Macro.
     * @param closeTime Unix timestamp after which trading is disabled.
     * @param resolver Public wallet authorized to resolve the market after close.
     * @param seedLiquidity VerifiedToken amount that initializes both virtual outcome reserves.
     */
    function createMarket(
        string calldata question,
        string calldata category,
        uint64 closeTime,
        address resolver,
        uint256 seedLiquidity
    ) external nonReentrant returns (uint256 marketId) {
        if (bytes(question).length == 0 || bytes(question).length > 240) revert InvalidAmount();
        if (closeTime <= block.timestamp || resolver == address(0)) revert InvalidAddress();
        if (seedLiquidity == 0) revert InvalidAmount();

        collateralToken.safeTransferFrom(msg.sender, address(this), seedLiquidity);

        marketId = ++marketCount;
        _markets[marketId] = Market({
            question: question,
            category: category,
            closeTime: closeTime,
            resolver: resolver,
            creator: msg.sender,
            yesReserve: seedLiquidity,
            noReserve: seedLiquidity,
            collateralPool: seedLiquidity,
            yesUserShares: 0,
            noUserShares: 0,
            winningUserShares: 0,
            resolved: false,
            resolvedOutcome: Outcome.YES,
            residualClaimed: false
        });

        emit MarketCreated(marketId, msg.sender, resolver, question, closeTime, seedLiquidity);
    }

    /**
     * @notice Buy YES or NO outcome shares with collateral.
     * @dev The market uses a binary constant-product reserve model. Buying an outcome first mints
     *      a complete-set-equivalent base position, then trades its opposite half into the AMM.
     */
    function buy(uint256 marketId, Outcome outcome, uint256 collateralIn)
        external
        nonReentrant
        returns (uint256 sharesOut)
    {
        Market storage market = _market(marketId);
        if (market.resolved) revert MarketAlreadyResolved();
        if (block.timestamp >= market.closeTime) revert MarketClosed();
        if (collateralIn == 0) revert InvalidAmount();

        uint256 fee = (collateralIn * feeBps) / 10_000;
        uint256 netCollateral = collateralIn - fee;
        if (netCollateral == 0) revert InvalidAmount();

        collateralToken.safeTransferFrom(msg.sender, address(this), collateralIn);
        if (fee > 0) collateralToken.safeTransfer(feeRecipient, fee);

        uint256 swapOut;
        if (outcome == Outcome.YES) {
            // Base YES shares are allocated to the buyer; the matching NO half grows the NO reserve.
            swapOut = _getAmountOut(netCollateral, market.noReserve, market.yesReserve);
            if (swapOut >= market.yesReserve) revert InsufficientLiquidity();
            market.noReserve += netCollateral;
            market.yesReserve -= swapOut;
            sharesOut = netCollateral + swapOut;
            _yesShares[marketId][msg.sender] += sharesOut;
            market.yesUserShares += sharesOut;
        } else {
            // Base NO shares are allocated to the buyer; the matching YES half grows the YES reserve.
            swapOut = _getAmountOut(netCollateral, market.yesReserve, market.noReserve);
            if (swapOut >= market.noReserve) revert InsufficientLiquidity();
            market.yesReserve += netCollateral;
            market.noReserve -= swapOut;
            sharesOut = netCollateral + swapOut;
            _noShares[marketId][msg.sender] += sharesOut;
            market.noUserShares += sharesOut;
        }

        market.collateralPool += netCollateral;
        emit SharesBought(marketId, msg.sender, outcome, collateralIn, fee, sharesOut);
    }

    /**
     * @notice Sell outcome shares back to the market before close time.
     * @dev The seller redeems a paired amount of shares for collateral and returns the remainder
     *      to the AMM, preserving the constant-product reserve invariant before applying fees.
     */
    function sell(uint256 marketId, Outcome outcome, uint256 sharesIn)
        external
        nonReentrant
        returns (uint256 netCollateralOut)
    {
        Market storage market = _market(marketId);
        if (market.resolved) revert MarketAlreadyResolved();
        if (block.timestamp >= market.closeTime) revert MarketClosed();
        if (sharesIn == 0) revert InvalidAmount();

        uint256 grossCollateralOut;
        if (outcome == Outcome.YES) {
            if (_yesShares[marketId][msg.sender] < sharesIn) revert InsufficientShares();
            grossCollateralOut = _getSellAmount(market.yesReserve, market.noReserve, sharesIn);
            if (grossCollateralOut == 0 || grossCollateralOut >= market.noReserve) revert InsufficientLiquidity();
            _yesShares[marketId][msg.sender] -= sharesIn;
            market.yesUserShares -= sharesIn;
            market.yesReserve += sharesIn - grossCollateralOut;
            market.noReserve -= grossCollateralOut;
        } else {
            if (_noShares[marketId][msg.sender] < sharesIn) revert InsufficientShares();
            grossCollateralOut = _getSellAmount(market.noReserve, market.yesReserve, sharesIn);
            if (grossCollateralOut == 0 || grossCollateralOut >= market.yesReserve) revert InsufficientLiquidity();
            _noShares[marketId][msg.sender] -= sharesIn;
            market.noUserShares -= sharesIn;
            market.noReserve += sharesIn - grossCollateralOut;
            market.yesReserve -= grossCollateralOut;
        }

        if (grossCollateralOut > market.collateralPool) revert InsufficientLiquidity();
        uint256 fee = (grossCollateralOut * feeBps) / 10_000;
        netCollateralOut = grossCollateralOut - fee;
        market.collateralPool -= grossCollateralOut;

        collateralToken.safeTransfer(msg.sender, netCollateralOut);
        if (fee > 0) collateralToken.safeTransfer(feeRecipient, fee);

        emit SharesSold(marketId, msg.sender, outcome, sharesIn, grossCollateralOut, fee, netCollateralOut);
    }

    /**
     * @notice Resolve a closed market with its final binary outcome.
     */
    function resolveMarket(uint256 marketId, Outcome outcome) external {
        Market storage market = _market(marketId);
        if (market.resolved) revert MarketAlreadyResolved();
        if (block.timestamp < market.closeTime) revert MarketNotClosed();
        if (msg.sender != market.resolver) revert NotResolver();

        market.resolved = true;
        market.resolvedOutcome = outcome;
        market.winningUserShares = outcome == Outcome.YES ? market.yesUserShares : market.noUserShares;

        // Every user winning share is backed by exactly one collateral token.
        if (market.winningUserShares > market.collateralPool) revert InsufficientLiquidity();
        emit MarketResolved(marketId, outcome, market.winningUserShares);
    }

    /**
     * @notice Redeem all winning shares held by the caller after the market is resolved.
     */
    function claimPayout(uint256 marketId) external nonReentrant returns (uint256 payout) {
        Market storage market = _market(marketId);
        if (!market.resolved) revert MarketNotResolved();
        if (payoutClaimed[marketId][msg.sender]) revert AlreadyClaimed();

        payoutClaimed[marketId][msg.sender] = true;
        payout = market.resolvedOutcome == Outcome.YES
            ? _yesShares[marketId][msg.sender]
            : _noShares[marketId][msg.sender];
        if (payout == 0) revert NothingToClaim();

        if (market.resolvedOutcome == Outcome.YES) {
            _yesShares[marketId][msg.sender] = 0;
        } else {
            _noShares[marketId][msg.sender] = 0;
        }

        collateralToken.safeTransfer(msg.sender, payout);
        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    /**
     * @notice Return the unclaimed liquidity-provider residual after resolution.
     * @dev The residual equals collateral pool minus user-held winning shares snapshot.
     */
    function claimCreatorResidual(uint256 marketId) external nonReentrant returns (uint256 payout) {
        Market storage market = _market(marketId);
        if (!market.resolved) revert MarketNotResolved();
        if (msg.sender != market.creator) revert OnlyCreator();
        if (market.residualClaimed) revert ResidualAlreadyClaimed();

        market.residualClaimed = true;
        payout = market.collateralPool - market.winningUserShares;
        if (payout > 0) collateralToken.safeTransfer(msg.sender, payout);
        emit CreatorResidualClaimed(marketId, msg.sender, payout);
    }

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return _market(marketId);
    }

    function getPosition(uint256 marketId, address user)
        external
        view
        returns (uint256 yesShares, uint256 noShares, bool hasClaimed)
    {
        _market(marketId);
        return (_yesShares[marketId][user], _noShares[marketId][user], payoutClaimed[marketId][user]);
    }

    function quoteBuy(uint256 marketId, Outcome outcome, uint256 collateralIn)
        external
        view
        returns (uint256 sharesOut, uint256 fee, uint256 yesPriceE18)
    {
        Market storage market = _market(marketId);
        if (collateralIn == 0) return (0, 0, _yesPrice(market));
        fee = (collateralIn * feeBps) / 10_000;
        uint256 netCollateral = collateralIn - fee;
        if (outcome == Outcome.YES) {
            sharesOut = netCollateral + _getAmountOut(netCollateral, market.noReserve, market.yesReserve);
        } else {
            sharesOut = netCollateral + _getAmountOut(netCollateral, market.yesReserve, market.noReserve);
        }
        yesPriceE18 = _yesPrice(market);
    }

    function quoteSell(uint256 marketId, Outcome outcome, uint256 sharesIn)
        external
        view
        returns (uint256 netCollateralOut, uint256 fee, uint256 yesPriceE18)
    {
        Market storage market = _market(marketId);
        if (sharesIn == 0) return (0, 0, _yesPrice(market));
        uint256 gross = outcome == Outcome.YES
            ? _getSellAmount(market.yesReserve, market.noReserve, sharesIn)
            : _getSellAmount(market.noReserve, market.yesReserve, sharesIn);
        fee = (gross * feeBps) / 10_000;
        netCollateralOut = gross - fee;
        yesPriceE18 = _yesPrice(market);
    }

    function getYesPriceE18(uint256 marketId) external view returns (uint256) {
        return _yesPrice(_market(marketId));
    }

    function _market(uint256 marketId) private view returns (Market storage market) {
        if (marketId == 0 || marketId > marketCount) revert InvalidMarket();
        market = _markets[marketId];
    }

    /**
     * @dev Constant-product output without a second swap fee; protocol fee is charged on collateral input.
     * @param amountIn Complementary outcome shares implicitly supplied by the complete-set mechanism.
     * @param reserveIn Reserve of complementary outcome shares.
     * @param reserveOut Reserve of selected outcome shares.
     */
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) private pure returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) return 0;
        return (reserveOut * amountIn) / (reserveIn + amountIn);
    }

    /**
     * @dev Solve (selectedReserve + sharesIn - collateralOut) * (otherReserve - collateralOut)
     *      = selectedReserve * otherReserve for the smaller valid root.
     */
    function _getSellAmount(uint256 selectedReserve, uint256 otherReserve, uint256 sharesIn)
        private
        pure
        returns (uint256)
    {
        if (sharesIn == 0 || selectedReserve == 0 || otherReserve == 0) return 0;
        uint256 sum = selectedReserve + otherReserve + sharesIn;
        uint256 discriminant = (sum * sum) - (4 * otherReserve * sharesIn);
        uint256 root = _sqrt(discriminant);
        return (sum - root) / 2;
    }

    function _yesPrice(Market storage market) private view returns (uint256) {
        uint256 denominator = market.yesReserve + market.noReserve;
        if (denominator == 0) return 0;
        return (market.noReserve * 1e18) / denominator;
    }

    function _sqrt(uint256 x) private pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
