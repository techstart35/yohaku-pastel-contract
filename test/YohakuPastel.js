const {expect} = require("chai");
const {ethers} = require("hardhat");

const maxSupply = 1000;
const maxMintAmount = 5;
const whiteListMaxMintAmount = 10;
const baseURI = "ipfs://QmRJmwpNnDmdMxki9hbGrR8UzKEDRXYhr4tEdfmGuHWuRp/"
const baseExtension = ".json";
const constructorMintAmount = 30;

const PhaseBeforeMint = 0
const PhaseWLMint = 1
const PhasePublicMint = 2

describe("YohakuPastel", function () {
    let Token;
    let ad;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        Token = await ethers.getContractFactory("YohakuPastel");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        ad = await Token.deploy();

        expect(await ad.phase()).to.equal(0);
        expect(await ad.maxSupply()).to.equal(maxSupply);
        expect(await ad.maxMintAmount()).to.equal(maxMintAmount);

        expect(await ad.baseURI()).to.equal(baseURI);
        expect(await ad.baseExtension()).to.equal(baseExtension);

        expect(await ad.totalSupply()).to.equal(constructorMintAmount);
    });

    describe("whiteListMintの検証", function () {
        beforeEach(async function () {
            // addr1をWLに登録する
            await ad.setWhiteList([addr1.address])
            expect(await ad.getWhiteListCountOfOwner(addr1.address)).to.equal(whiteListMaxMintAmount)

            // PhaseをWLMintに変更する
            await ad.setPhase(1);
            expect(await ad.phase()).to.equal(1);
        })

        it("WL所有者がmintできる", async () => {
            const mintAmount = 1
            await ad.connect(addr1).whiteListMint(mintAmount);
            expect(await ad.totalSupply()).to.equal(mintAmount + constructorMintAmount);
        });

        it("WL所有者が規定の枚数内であれば複数回mintできる", async () => {
            // 1回目
            await ad.connect(addr1).whiteListMint(5);
            expect(await ad.totalSupply()).to.equal(5 + constructorMintAmount);

            // 2回目
            await ad.connect(addr1).whiteListMint(5);
            expect(await ad.totalSupply()).to.equal(10 + constructorMintAmount);
        })

        it("ownerでもWLに入っていない場合はエラーが返される", async () => {
            await expect(ad.connect(owner).whiteListMint(1)).reverted;
        })

        it("指定の枚数を超える場合はエラーが返される", async () => {
            const mintAmount = whiteListMaxMintAmount + 1

            await expect(ad.connect(addr1).whiteListMint(mintAmount)).reverted;
        })

        it("複数回のmintで指定の枚数を超える場合はエラーが返される", async () => {
            // 1回目：正常
            await ad.connect(addr1).whiteListMint(5);
            expect(await ad.totalSupply()).to.equal(5 + constructorMintAmount);

            // 1回目：エラー
            await expect(ad.connect(addr1).whiteListMint(6)).reverted;
        })

        it("PhaseがBeforeMintの場合はエラーが返される", async () => {
            await ad.setPhase(0);
            expect(await ad.phase()).equal(0);

            await expect(ad.connect(addr1).whiteListMint(1)).reverted;
        })

        it("PhaseがPublicMintの場合はエラーが返される", async () => {
            await ad.setPhase(2);
            expect(await ad.phase()).equal(2);

            await expect(ad.connect(addr1).whiteListMint(1)).reverted;
        })

        it("mintAmountが0の場合はエラーが返される", async () => {
            await expect(ad.connect(addr1).whiteListMint(0)).reverted;
        })

        it("供給量の上限を超える場合はエラーが返される", async () => {
            // PhaseをPublicMintに変更
            await ad.setPhase(2);
            expect(await ad.phase()).to.equal(2);

            // 1000枚は正常にmintされる
            // (194 * 5) + 30 = 1000
            for (let i = 0; i < 194; i++) {
                await ad.connect(addr1).mint(maxMintAmount);
                expect(await ad.totalSupply())
                    .to.equal((maxMintAmount * (i + 1)) + constructorMintAmount);
            }

            // PhaseをWLMintに変更
            await ad.setPhase(1);
            expect(await ad.phase()).to.equal(1);

            // 1000枚を超えるためエラーが返される
            await expect(ad.connect(addr1).whiteListMint(1)).reverted;
        })

        it("WLに入っていない人はエラーが返される", async () => {
            await expect(ad.connect(addr2).whiteListMint(1)).reverted;
        })
    })

    describe("mintの検証", function () {
        beforeEach(async function () {
            // addr1をWLに登録する
            await ad.setWhiteList([addr1.address])
            expect(await ad.getWhiteListCountOfOwner(addr1.address)).to.equal(whiteListMaxMintAmount)

            // PhaseをPublicMintに変更する
            await ad.setPhase(2);
            expect(await ad.phase()).to.equal(2);
        })

        it("権限がない人もmintできる", async () => {
            const mintAmount = 1

            await ad.connect(addr2).mint(mintAmount);
            expect(await ad.totalSupply()).to.equal(mintAmount + constructorMintAmount);
        });

        it("オーナーがmintできる", async () => {
            const mintAmount = 1

            await ad.connect(owner).mint(mintAmount);
            expect(await ad.totalSupply()).to.equal(mintAmount + constructorMintAmount);
        });

        it("WLを持っている人もmintできる", async () => {
            const mintAmount = 1

            await ad.connect(addr1).mint(mintAmount);
            expect(await ad.totalSupply()).to.equal(mintAmount + constructorMintAmount);
        });

        it("複数回、上限なくmintできる", async () => {
            // 1人で最大枚数までmintする
            // (194 * 5) + 30 = 1000
            for (let i = 0; i < 194; i++) {
                await ad.connect(addr1).mint(maxMintAmount);
                expect(await ad.totalSupply())
                    .to.equal((maxMintAmount * (i + 1)) + constructorMintAmount);
            }
        });

        it("PhaseがBeforeMintの場合はエラーが返される", async () => {
            await ad.setPhase(0);
            expect(await ad.phase()).equal(0);

            await expect(ad.connect(addr1).mint(1)).reverted;
        });

        it("PhaseがWLMintの場合はエラーが返される", async () => {
            await ad.setPhase(1);
            expect(await ad.phase()).equal(1);

            await expect(ad.connect(addr1).mint(1)).reverted;
        });

        it("指定の枚数を超える場合はエラーが返される", async () => {
            await expect(ad.connect(addr1).mint(maxMintAmount + 1)).reverted;
        });

        it("mintAmountが0の場合はエラーが返される", async () => {
            await expect(ad.connect(addr1).mint(0)).reverted;
        });

        it("供給量の上限を超える場合はエラーが返される", async () => {
            // 1000枚mintする
            // (194 * 5) + 30 = 1000
            for (let i = 0; i < 194; i++) {
                await ad.connect(addr1).mint(maxMintAmount);
                expect(await ad.totalSupply())
                    .equal((maxMintAmount * (i + 1)) + constructorMintAmount);
            }

            // 1000枚を超えるためエラーが返される
            await expect(ad.connect(addr1).mint(1)).reverted;
        });
    })

    describe("setWhiteListの検証", function () {
        it("指定したアドレスが登録されている", async () => {
            await ad.setWhiteList([addr1.address, addr2.address]);

            expect(await ad.getWhiteListCountOfOwner(addr1.address)).equal(whiteListMaxMintAmount);
            expect(await ad.getWhiteListCountOfOwner(addr2.address)).equal(whiteListMaxMintAmount);

            // WhiteListCountを検証
            expect(await ad.whiteListCount()).equal(whiteListMaxMintAmount * 2);
        });

        it("追加する場合も正しく登録される", async () => {
            // 1回目
            await ad.connect(owner).setWhiteList([addr1.address]);

            // 2回目
            await ad.connect(owner).setWhiteList([addr2.address]);

            expect(await ad.getWhiteListCountOfOwner(addr1.address)).equal(whiteListMaxMintAmount);
            expect(await ad.getWhiteListCountOfOwner(addr2.address)).equal(whiteListMaxMintAmount);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).setWhiteList([addr1.address])).reverted;
        });
    })

    describe("deleteWhiteListの検証", function () {
        beforeEach(async function () {
            // addr1をWLに登録する
            await ad.setWhiteList([addr1.address]);
            expect(await ad.getWhiteListCountOfOwner(addr1.address)).to.equal(whiteListMaxMintAmount);
        })

        it("登録済みのアドレスを削除できる", async () => {
            // 登録済みのaddr1を削除
            await ad.deleteWhiteList(addr1.address);
            expect(await ad.getWhiteListCountOfOwner(addr1.address)).to.equal(0);

            // WhiteListCountを検証
            expect(await ad.whiteListCount()).to.equal(0);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).deleteWhiteList(addr1.address)).reverted;
        });

        it("登録されていないアドレスを削除するとエラーが返される", async () => {
            await expect(ad.connect(addr1).deleteWhiteList(addr2.address)).reverted;
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).deleteWhiteList(addr1.address)).reverted;
        });
    })

    describe("setPhaseの検証", function () {
        it("WLMintに設定できる", async () => {
            await ad.setPhase(PhaseWLMint);
            expect(await ad.phase()).to.equal(PhaseWLMint);
        });

        it("PublicMintに設定できる", async () => {
            await ad.setPhase(PhasePublicMint);
            expect(await ad.phase()).to.equal(PhasePublicMint);
        });

        it("WLMintからBeforeMintに変更できる", async () => {
            // WLMintに設定
            await ad.setPhase(PhaseWLMint);
            expect(await ad.phase()).to.equal(PhaseWLMint);

            // BeforeMintに設定
            await ad.setPhase(PhaseBeforeMint);
            expect(await ad.phase()).to.equal(PhaseBeforeMint);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).setPhase(PhasePublicMint)).reverted;
        });
    })

    describe("setMaxMintAmountの検証", function () {
        beforeEach(async function () {
            // maxMintAmountが初期値であることを検証
            expect(await ad.maxMintAmount()).to.equal(5);
        })

        it("指定した値が設定できる", async () => {
            await ad.setMaxMintAmount(10);
            expect(await ad.maxMintAmount()).to.equal(10);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).setMaxMintAmount(10)).reverted;
        });
    })

    describe("setWhiteListMaxMintAmountの検証", function () {
        beforeEach(async function () {
            // whiteListMaxMintAmountが初期値であることを検証
            expect(await ad.whiteListMaxMintAmount()).to.equal(10);
        })

        it("指定した値が設定できる", async () => {
            await ad.setWhiteListMaxMintAmount(5);
            expect(await ad.whiteListMaxMintAmount()).to.equal(5);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).setWhiteListMaxMintAmount(5)).reverted;
        });
    })

    describe("setBaseURIの検証", function () {
        beforeEach(async function () {
            // baseURIが初期値であることを検証
            expect(await ad.baseURI()).to.equal(baseURI);
        })

        it("指定した値が設定できる", async () => {
            const newBaseURI = "ipfs://xxxx"
            await ad.setBaseURI(newBaseURI);
            expect(await ad.baseURI()).to.equal(newBaseURI);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).setBaseURI("ipfs://xxx")).reverted;
        });
    })

    describe("setBaseExtensionの検証", function () {
        beforeEach(async function () {
            // baseExtensionが初期値であることを検証
            expect(await ad.baseExtension()).to.equal(baseExtension);
        })

        it("指定した値が設定できる", async () => {
            const newBaseExtension = ".xml"
            await ad.setBaseExtension(newBaseExtension);
            expect(await ad.baseExtension()).to.equal(newBaseExtension);
        });

        it("owner以外が実行するとエラーが返される", async () => {
            await expect(ad.connect(addr1).setBaseExtension(".xml")).reverted;
        });
    })

    describe("tokenURIの検証", function () {
        beforeEach(async function () {
            // baseURIが初期値であることを検証
            expect(await ad.baseURI()).to.equal(baseURI);

            // baseExtensionが初期値であることを検証
            expect(await ad.baseExtension()).to.equal(baseExtension);
        })

        it("指定した値が取得できる", async () => {
            expect(await ad.connect(addr1).tokenURI(1)).to.equal(baseURI + "1" + baseExtension);
        });
    })

    describe("getWhiteListCountOfOwnerの検証", function () {
        beforeEach(async function () {
            // addr1をWLに登録する
            await ad.setWhiteList([addr1.address])
        })

        it("指定した値が取得できる", async () => {
            expect(await ad.getWhiteListCountOfOwner(addr1.address)).to.equal(whiteListMaxMintAmount);
        });
    })
})