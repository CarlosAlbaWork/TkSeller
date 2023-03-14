import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.18",
    settings: {
      // viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    goerli: {
      url: "https://eth-goerli.public.blastapi.io",
      accounts: [ "0xe3a4f7f1dfaf24c3d90af1b2680d1749392a7181bc2a4388cd35d26102bcc0a8", "0xa21dcec037345f3772acb3ec2f90e34fbc841f2ca1f53bde7a3a65c2fc3c783c", "0x4bfd3e8f40ba6df6348296e9217202eb8143e9937f3ba0b88600405e8f2cc554", "0x20041c338cb6dc587f626442ef926732fe755b9eb0d000ab00a4e0fe27f95049", "0x7721aae338c3a19cf749931e826273ffdc927090440b16cf182c9bd0cb7fc801", "0x1af89c76abfda76b7757cc222b06f8d3fb5009ba36ad5617dfcd0b0d67d5a0e6", "0x0cdcff234c34bd0be4c20848b4346260b1b773b745e392d6de1512c891bf5f90", "0x5b124e1c2f9dfdee9d8dad358ffeea3543b4c4fac3e7c20b3c7e3f648beff608", "0xa50268ca15239b1da8b4988426a3b580d8c1fa224606da2b12969048eebb7537", "0xdd054f5cf38cad784fd2ca374ba012ad9ebb5f05db86949fd369df97458f697b" ]
      /*"0x87Df3251792c50Af8108663D5E7fB03776F4Adf7"
      "0xc9766e0A31015957E67355698861Aa95cb564943"
      "0x672e52954cFC4F7e5ba33264F736A57B81C9B15F"
      "0xa87f02F4f0b502460eFe128C6E6fcEa01a80a027"
      "0xB0002C6451830c37BF3C15513b2559476Da0fa06"
      "0x6f8bdC6595D6b8ECc021944306ADD2aA0D456975"
      "0x37Ef391E3D930974FE4b26E99dBE7493355f5436"
      "0x48fba5ff6e6854719d07041a79C0F0cb7620aA50"
      "0x183aB7B0c16228d0D1266621ae9b692fDB342B2b"
      "0xE04d47DC6c95F6855Ee17DC1a176f1da914B7f26"
       */
    },
    binanceTest: {
      url: "https://data-seed-prebsc-1-s3.binance.org:8545",
      accounts: [ "0xe3a4f7f1dfaf24c3d90af1b2680d1749392a7181bc2a4388cd35d26102bcc0a8", "0xa21dcec037345f3772acb3ec2f90e34fbc841f2ca1f53bde7a3a65c2fc3c783c", "0x4bfd3e8f40ba6df6348296e9217202eb8143e9937f3ba0b88600405e8f2cc554", "0x20041c338cb6dc587f626442ef926732fe755b9eb0d000ab00a4e0fe27f95049", "0x7721aae338c3a19cf749931e826273ffdc927090440b16cf182c9bd0cb7fc801", "0x1af89c76abfda76b7757cc222b06f8d3fb5009ba36ad5617dfcd0b0d67d5a0e6", "0x0cdcff234c34bd0be4c20848b4346260b1b773b745e392d6de1512c891bf5f90", "0x5b124e1c2f9dfdee9d8dad358ffeea3543b4c4fac3e7c20b3c7e3f648beff608", "0xa50268ca15239b1da8b4988426a3b580d8c1fa224606da2b12969048eebb7537", "0xdd054f5cf38cad784fd2ca374ba012ad9ebb5f05db86949fd369df97458f697b" ]
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

export default config;
