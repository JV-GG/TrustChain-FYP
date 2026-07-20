import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("TrustChain", function () {
  let trustChain;
  let owner, campaignOwner, donor, nonOwner;

  beforeEach(async function () {
    [owner, campaignOwner, donor, nonOwner] = await ethers.getSigners();
    const TrustChainFactory = await ethers.getContractFactory("TrustChain");
    trustChain = await TrustChainFactory.deploy();
    await trustChain.waitForDeployment();
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign successfully", async function () {
      const title = "Clean Water Initiative";
      const description = "Providing clean water to rural areas";
      const ipfsHash = "QmTest123456789";
      const goalAmount = ethers.parseEther("5");

      await expect(
        trustChain.connect(campaignOwner).createCampaign(title, description, ipfsHash, goalAmount)
      )
        .to.emit(trustChain, "CampaignCreated")
        .withArgs(1, campaignOwner.address, title, goalAmount, ipfsHash);

      expect(await trustChain.getCampaignCount()).to.equal(1);

      const campaign = await trustChain.getCampaign(1);
      expect(campaign.owner).to.equal(campaignOwner.address);
      expect(campaign.title).to.equal(title);
      expect(campaign.description).to.equal(description);
      expect(campaign.ipfsHash).to.equal(ipfsHash);
      expect(campaign.goalAmount).to.equal(goalAmount);
      expect(campaign.raisedAmount).to.equal(0);
      expect(campaign.disbursedAmount).to.equal(0);
      expect(campaign.isActive).to.be.true;
    });
  });

  describe("Donations", function () {
    it("Should accept donations and update campaign raised amount", async function () {
      const goalAmount = ethers.parseEther("10");
      await trustChain.connect(campaignOwner).createCampaign("EduFund", "Education for kids", "QmHashEdu", goalAmount);

      const donationAmount = ethers.parseEther("2");
      await expect(
        trustChain.connect(donor).donate(1, { value: donationAmount })
      )
        .to.emit(trustChain, "DonationReceived")
        .withArgs(1, donor.address, donationAmount);

      const campaign = await trustChain.getCampaign(1);
      expect(campaign.raisedAmount).to.equal(donationAmount);

      const contractBalance = await ethers.provider.getBalance(await trustChain.getAddress());
      expect(contractBalance).to.equal(donationAmount);
    });
  });

  describe("Disbursement & Access Control", function () {
    it("Should allow campaign owner to disburse funds", async function () {
      const goalAmount = ethers.parseEther("10");
      await trustChain.connect(campaignOwner).createCampaign("HealthFund", "Healthcare supplies", "QmHashHealth", goalAmount);

      const donationAmount = ethers.parseEther("4");
      await trustChain.connect(donor).donate(1, { value: donationAmount });

      const disburseAmount = ethers.parseEther("2");
      const initialBalance = await ethers.provider.getBalance(campaignOwner.address);

      const tx = await trustChain.connect(campaignOwner).disburseFunds(1, disburseAmount);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const campaign = await trustChain.getCampaign(1);
      expect(campaign.disbursedAmount).to.equal(disburseAmount);

      const finalBalance = await ethers.provider.getBalance(campaignOwner.address);
      expect(finalBalance).to.equal(initialBalance + disburseAmount - gasUsed);
    });

    it("Should prevent non-campaign-owner from disbursing funds", async function () {
      const goalAmount = ethers.parseEther("10");
      await trustChain.connect(campaignOwner).createCampaign("ShelterFund", "Building shelters", "QmHashShelter", goalAmount);

      const donationAmount = ethers.parseEther("3");
      await trustChain.connect(donor).donate(1, { value: donationAmount });

      await expect(
        trustChain.connect(nonOwner).disburseFunds(1, ethers.parseEther("1"))
      ).to.be.revertedWith("Only campaign owner can disburse funds");
    });
  });
});
