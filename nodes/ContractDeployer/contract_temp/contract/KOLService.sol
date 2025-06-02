// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title KOLService
 * @dev This contract manages KOL (Key Opinion Leader) payments and platform fees
 * It supports both ETH and ERC20 token payments
 * Implements role-based access control and reentrancy protection
 */
contract KOLService is 
    Initializable, 
    AccessControlUpgradeable, 
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable 
{
    using ECDSA for bytes32;
    
    // Constants
    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    // State variables
    mapping(address => bool) public whitelist;
    uint256 public kolRatio; // Ratio in basis points (1-10000)
    
    // Project balances tracking
    struct ProjectBalance {
        address tokenAddress;
        uint256 balance;
    }
    mapping(address => ProjectBalance) public projectBalances;

    // EIP-712 type hashes
    bytes32 private constant PAYMENT_TYPEHASH = keccak256(
        "Payment(address kolAddress,uint256 amount,uint256 timestamp,address projectAddress)"
    );
    bytes32 private constant REDEEM_TYPEHASH = keccak256(
        "Redeem(address projectAddress,uint256 amount,uint256 timestamp)"
    );
    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    // Events
    event WhiteListUpdated(address[] addresses, bool status);
    event KOLRatioUpdated(uint256 newRatio);
    event PaymentIssued(address indexed project, address token, uint256 amount);
    event PaymentProcessed(address indexed kol, address token, uint256 amount);
    event Withdrawn(address token, uint256 amount);
    event Redeemed(address indexed project, address token, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract
     * @param _owner The address that will be granted the DEFAULT_ADMIN_ROLE
     */
    function initialize(address _owner) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    /**
     * @dev Set whitelist addresses
     * @param addresses Array of addresses to be whitelisted
     * @param status True to add to whitelist, false to remove
     */
    function setWhiteList(address[] calldata addresses, bool status) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i = 0; i < addresses.length; i++) {
            whitelist[addresses[i]] = status;
        }
        emit WhiteListUpdated(addresses, status);
    }

    /**
     * @dev Set KOL ratio (platform fee)
     * @param _ratio New ratio in basis points (1-10000)
     */
    function setKOLRatio(uint256 _ratio) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_ratio <= 10000, "Ratio must be <= 10000");
        kolRatio = _ratio;
        emit KOLRatioUpdated(_ratio);
    }

    /**
     * @dev Issue payment to the contract
     * @param tokenAddress Address of the token (use ETH_ADDRESS for ETH)
     * @param amount Amount to deposit
     * @param projectAddress Address of the project
     */
    function issue(
        address tokenAddress,
        uint256 amount,
        address projectAddress
    ) external payable nonReentrant {
        if (tokenAddress == ETH_ADDRESS) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        }

        projectBalances[projectAddress] = ProjectBalance({
            tokenAddress: tokenAddress,
            balance: projectBalances[projectAddress].balance + amount
        });

        emit PaymentIssued(projectAddress, tokenAddress, amount);
    }

    /**
     * @dev Internal function to verify EIP-712 signature
     * @param typeHash The type hash of the struct
     * @param data The encoded struct data
     * @param timestamp The timestamp for expiration check
     * @param signature The signature to verify
     * @return The recovered signer address
     */
    function _verifySignature(
        bytes32 typeHash,
        bytes memory data,
        uint256 timestamp,
        bytes calldata signature
    ) internal view returns (address) {
        require(block.timestamp <= timestamp + 1 hours, "Signature expired");
        
        bytes32 structHash = keccak256(abi.encodePacked(typeHash, data));

        bytes32 domainSeparator = keccak256(abi.encode(
            DOMAIN_TYPEHASH,
            keccak256(bytes("KOLService")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));

        address signer = digest.recover(signature);
        require(whitelist[signer], "Signer not in whitelist");
        return signer;
    }

    /**
     * @dev Process payment to KOL
     * @param kolAddress Address of the KOL
     * @param amount Amount to pay
     * @param timestamp Current timestamp
     * @param projectAddress Address of the project
     * @param signature Signature for verification
     */
    function payForKol(
        address kolAddress,
        uint256 amount,
        uint256 timestamp,
        address projectAddress,
        bytes calldata signature
    ) external nonReentrant {
        bytes memory data = abi.encode(
            kolAddress,
            amount,
            timestamp,
            projectAddress
        );
        _verifySignature(PAYMENT_TYPEHASH, data, timestamp, signature);

        ProjectBalance storage balance = projectBalances[projectAddress];
        require(balance.balance >= amount, "Insufficient balance");

        uint256 kolAmount = amount * (10000 - kolRatio) / 10000;
        balance.balance -= amount;

        if (balance.tokenAddress == ETH_ADDRESS) {
            (bool success, ) = kolAddress.call{value: kolAmount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(balance.tokenAddress).transfer(kolAddress, kolAmount);
        }

        emit PaymentProcessed(kolAddress, balance.tokenAddress, kolAmount);
    }

    /**
     * @dev Withdraw funds from contract
     * @param tokenAddress Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address tokenAddress, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (tokenAddress == ETH_ADDRESS) {
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(tokenAddress).transfer(msg.sender, amount);
        }
        emit Withdrawn(tokenAddress, amount);
    }

    /**
     * @dev Redeem remaining project balance
     * @param projectAddress Address of the project
     * @param amount Amount to redeem
     * @param timestamp Current timestamp
     * @param signature Signature for verification
     */
    function redeem(
        address projectAddress,
        uint256 amount,
        uint256 timestamp,
        bytes calldata signature
    ) external nonReentrant {
        bytes memory data = abi.encode(
            projectAddress,
            amount,
            timestamp
        );
        _verifySignature(REDEEM_TYPEHASH, data, timestamp, signature);
        
        ProjectBalance storage balance = projectBalances[projectAddress];
        require(balance.balance >= amount, "Insufficient balance");

        balance.balance -= amount;

        if (balance.tokenAddress == ETH_ADDRESS) {
            (bool success, ) = projectAddress.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(balance.tokenAddress).transfer(projectAddress, amount);
        }

        emit Redeemed(projectAddress, balance.tokenAddress, amount);
    }

    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // Function to receive ETH
    receive() external payable {}
} 