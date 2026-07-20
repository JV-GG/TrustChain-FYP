// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustChain
 * @dev Crowdfunding contract supporting campaign creation, ETH donation holding, owner fund disbursement, and campaign deactivation.
 */
contract TrustChain is ReentrancyGuard, Ownable {
    struct Campaign {
        address payable owner;
        string title;
        string description;
        string ipfsHash;
        uint256 goalAmount;
        uint256 raisedAmount;
        uint256 disbursedAmount;
        bool isActive;
        uint256 createdAt;
    }

    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed owner,
        string title,
        uint256 goalAmount,
        string ipfsHash
    );

    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount
    );

    event FundsDisbursed(
        uint256 indexed campaignId,
        address indexed owner,
        uint256 amount
    );

    event CampaignDeactivated(
        uint256 indexed campaignId,
        address indexed owner
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Creates a new crowdfunding campaign.
     * @param _title The title of the campaign.
     * @param _description Detailed campaign description.
     * @param _ipfsHash IPFS hash referencing supporting documentation/media.
     * @param _goalAmount Target funding amount in wei.
     * @return The ID of the created campaign.
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        string memory _ipfsHash,
        uint256 _goalAmount
    ) external returns (uint256) {
        require(_goalAmount > 0, "Goal amount must be greater than zero");

        campaignCount++;
        uint256 campaignId = campaignCount;

        campaigns[campaignId] = Campaign({
            owner: payable(msg.sender),
            title: _title,
            description: _description,
            ipfsHash: _ipfsHash,
            goalAmount: _goalAmount,
            raisedAmount: 0,
            disbursedAmount: 0,
            isActive: true,
            createdAt: block.timestamp
        });

        emit CampaignCreated(campaignId, msg.sender, _title, _goalAmount, _ipfsHash);
        return campaignId;
    }

    /**
     * @dev Donates ETH to a specific campaign.
     * @param _campaignId The ID of the campaign to receive donation.
     */
    function donate(uint256 _campaignId) external payable nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Invalid campaign ID");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.isActive, "Campaign is not active");
        require(msg.value > 0, "Donation amount must be greater than zero");

        campaign.raisedAmount += msg.value;

        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    /**
     * @dev Disburses funds from campaign balance to the campaign owner.
     * @param _campaignId The ID of the campaign.
     * @param _amount The amount of ETH (in wei) to disburse.
     */
    function disburseFunds(uint256 _campaignId, uint256 _amount) external nonReentrant {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Invalid campaign ID");
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.owner, "Only campaign owner can disburse funds");
        require(_amount > 0, "Disbursement amount must be greater than zero");

        uint256 availableBalance = campaign.raisedAmount - campaign.disbursedAmount;
        require(_amount <= availableBalance, "Insufficient campaign balance");

        campaign.disbursedAmount += _amount;

        (bool success, ) = campaign.owner.call{value: _amount}("");
        require(success, "Transfer failed");

        emit FundsDisbursed(_campaignId, campaign.owner, _amount);
    }

    /**
     * @dev Deactivates an active campaign. Can only be called by the campaign owner.
     * @param _campaignId The ID of the campaign to deactivate.
     */
    function deactivateCampaign(uint256 _campaignId) external {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Invalid campaign ID");
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.sender == campaign.owner, "Only campaign owner can deactivate");
        require(campaign.isActive, "Campaign is already inactive");

        campaign.isActive = false;

        emit CampaignDeactivated(_campaignId, msg.sender);
    }

    /**
     * @dev Returns full campaign details for a given campaign ID.
     * @param _campaignId The ID of the campaign.
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        require(_campaignId > 0 && _campaignId <= campaignCount, "Invalid campaign ID");
        return campaigns[_campaignId];
    }

    /**
     * @dev Returns total number of campaigns registered.
     */
    function getCampaignCount() external view returns (uint256) {
        return campaignCount;
    }
}
