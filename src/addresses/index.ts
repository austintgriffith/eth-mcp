/**
 * DeFi Protocol Address Registry
 * Comprehensive list of important contract addresses across chains
 */

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

export interface ProtocolAddresses {
  [contract: string]: string;
}

export interface ChainAddresses {
  chainId: number;
  name: string;
  tokens: Record<string, TokenInfo>;
  protocols: Record<string, ProtocolAddresses>;
}

// ============================================
// ETHEREUM MAINNET (Chain ID: 1)
// ============================================
export const ETHEREUM_MAINNET: ChainAddresses = {
  chainId: 1,
  name: "Ethereum Mainnet",
  tokens: {
    WETH: {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: "WETH",
      decimals: 18,
      name: "Wrapped Ether",
    },
    USDC: {
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    },
    USDT: {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: "USDT",
      decimals: 6,
      name: "Tether USD",
    },
    DAI: {
      address: "0x6B175474E89094C44Da98b954EesdeB6ef1D7C",
      symbol: "DAI",
      decimals: 18,
      name: "Dai Stablecoin",
    },
    WBTC: {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      symbol: "WBTC",
      decimals: 8,
      name: "Wrapped BTC",
    },
    stETH: {
      address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      symbol: "stETH",
      decimals: 18,
      name: "Lido Staked ETH",
    },
    wstETH: {
      address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      symbol: "wstETH",
      decimals: 18,
      name: "Wrapped stETH",
    },
    rETH: {
      address: "0xae78736Cd615f374D3085123A210448E74Fc6393",
      symbol: "rETH",
      decimals: 18,
      name: "Rocket Pool ETH",
    },
    cbETH: {
      address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704",
      symbol: "cbETH",
      decimals: 18,
      name: "Coinbase Staked ETH",
    },
    LINK: {
      address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      symbol: "LINK",
      decimals: 18,
      name: "ChainLink Token",
    },
    UNI: {
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      symbol: "UNI",
      decimals: 18,
      name: "Uniswap",
    },
    AAVE: {
      address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
      symbol: "AAVE",
      decimals: 18,
      name: "Aave Token",
    },
    CRV: {
      address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
      symbol: "CRV",
      decimals: 18,
      name: "Curve DAO Token",
    },
  },
  protocols: {
    uniswapV2: {
      factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
      router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    },
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      router02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    },
    sushiswap: {
      factory: "0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
      router: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    },
    aaveV3: {
      pool: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
      poolDataProvider: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
      oracle: "0x54586bE62E3c3580375aE3723C145253060Ca0C2",
    },
    compoundV3: {
      cUSDCv3: "0xc3d688B66703497DAA19211EEdff47f25384cdc3",
      cWETHv3: "0xA17581A9E3356d9A858b789D68B4d866e593aE94",
      rewards: "0x1B0e765F6224C21223AeA2af16c1C46E38885a40",
    },
    curve: {
      addressProvider: "0x0000000022D53366457F9d5E68Ec105046FC4383",
      triCrypto2: "0xD51a44d3FaE010294C616388b506AcdA1bfAAE46",
      stETHPool: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
    },
    lido: {
      stETH: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
      wstETH: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
      withdrawalQueue: "0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1",
    },
    chainlink: {
      ETH_USD: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      BTC_USD: "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
      USDC_USD: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      DAI_USD: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      LINK_USD: "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
    },
    ens: {
      registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
      resolver: "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63",
    },
  },
};

// ============================================
// BASE (Chain ID: 8453)
// ============================================
export const BASE: ChainAddresses = {
  chainId: 8453,
  name: "Base",
  tokens: {
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      decimals: 18,
      name: "Wrapped Ether",
    },
    USDC: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    },
    USDbC: {
      address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
      symbol: "USDbC",
      decimals: 6,
      name: "Bridged USDC (Base)",
    },
    DAI: {
      address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
      symbol: "DAI",
      decimals: 18,
      name: "Dai Stablecoin",
    },
    cbETH: {
      address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
      symbol: "cbETH",
      decimals: 18,
      name: "Coinbase Staked ETH",
    },
    wstETH: {
      address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452",
      symbol: "wstETH",
      decimals: 18,
      name: "Wrapped stETH",
    },
    rETH: {
      address: "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c",
      symbol: "rETH",
      decimals: 18,
      name: "Rocket Pool ETH",
    },
    AERO: {
      address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
      symbol: "AERO",
      decimals: 18,
      name: "Aerodrome",
    },
  },
  protocols: {
    uniswapV3: {
      factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      router: "0x2626664c2603336E57B271c5C0b26F421741e481",
      quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
      positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
    },
    aerodrome: {
      router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
      factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
      voter: "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5",
    },
    aaveV3: {
      pool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
      oracle: "0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156",
    },
    moonwell: {
      comptroller: "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
      mWETH: "0x628ff693426583D9a7FB391E54366292F509D457",
      mUSDbC: "0x703843C3379b52F9FF486c9f5892218d2a065cC8",
      mDAI: "0x73b06D8d18De422E269645eaCe15400DE7462417",
      mwstETH: "0x627Fe393Bc6EdDA28e99AE648fD6fF362514304b",
      mCbETH: "0x3bf93770f2d4a794c3d9EBEfBAeBAE2a8f09A5E5",
      // ERC-4626 Vaults
      flagshipETH: "0xa0E430870c4604CcfC7B38Ca7845B1FF653D0ff1",
      flagshipUSDC: "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca",
    },
    morpho: {
      morphoBlue: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    },
    chainlink: {
      ETH_USD: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      USDC_USD: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
      cbETH_USD: "0xd7818272B9e248357d13057AAb0B417aF31E817d",
    },
  },
};

// ============================================
// OPTIMISM (Chain ID: 10)
// ============================================
export const OPTIMISM: ChainAddresses = {
  chainId: 10,
  name: "Optimism",
  tokens: {
    WETH: {
      address: "0x4200000000000000000000000000000000000006",
      symbol: "WETH",
      decimals: 18,
      name: "Wrapped Ether",
    },
    USDC: {
      address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    },
    "USDC.e": {
      address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      symbol: "USDC.e",
      decimals: 6,
      name: "Bridged USDC",
    },
    USDT: {
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      symbol: "USDT",
      decimals: 6,
      name: "Tether USD",
    },
    DAI: {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      symbol: "DAI",
      decimals: 18,
      name: "Dai Stablecoin",
    },
    WBTC: {
      address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095",
      symbol: "WBTC",
      decimals: 8,
      name: "Wrapped BTC",
    },
    wstETH: {
      address: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
      symbol: "wstETH",
      decimals: 18,
      name: "Wrapped stETH",
    },
    rETH: {
      address: "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D",
      symbol: "rETH",
      decimals: 18,
      name: "Rocket Pool ETH",
    },
    OP: {
      address: "0x4200000000000000000000000000000000000042",
      symbol: "OP",
      decimals: 18,
      name: "Optimism",
    },
    VELO: {
      address: "0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db",
      symbol: "VELO",
      decimals: 18,
      name: "Velodrome",
    },
  },
  protocols: {
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      router02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    },
    velodrome: {
      router: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858",
      factory: "0xF1046053aa5682b4F9a81b5481394DA16BE5FF5a",
      voter: "0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C",
    },
    aaveV3: {
      pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      oracle: "0xD81eb3728a631871a7eBBaD631b5f424909f0c77",
    },
    chainlink: {
      ETH_USD: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
      BTC_USD: "0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593",
      USDC_USD: "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3",
      OP_USD: "0x0D276FC14719f9292D5C1eA2198673d1f4269246",
    },
  },
};

// ============================================
// ARBITRUM (Chain ID: 42161)
// ============================================
export const ARBITRUM: ChainAddresses = {
  chainId: 42161,
  name: "Arbitrum One",
  tokens: {
    WETH: {
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      symbol: "WETH",
      decimals: 18,
      name: "Wrapped Ether",
    },
    USDC: {
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    },
    "USDC.e": {
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      symbol: "USDC.e",
      decimals: 6,
      name: "Bridged USDC",
    },
    USDT: {
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      symbol: "USDT",
      decimals: 6,
      name: "Tether USD",
    },
    DAI: {
      address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      symbol: "DAI",
      decimals: 18,
      name: "Dai Stablecoin",
    },
    WBTC: {
      address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
      symbol: "WBTC",
      decimals: 8,
      name: "Wrapped BTC",
    },
    wstETH: {
      address: "0x5979D7b546E38E414F7E9822514be443A4800529",
      symbol: "wstETH",
      decimals: 18,
      name: "Wrapped stETH",
    },
    rETH: {
      address: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8",
      symbol: "rETH",
      decimals: 18,
      name: "Rocket Pool ETH",
    },
    ARB: {
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      symbol: "ARB",
      decimals: 18,
      name: "Arbitrum",
    },
    GMX: {
      address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a",
      symbol: "GMX",
      decimals: 18,
      name: "GMX",
    },
  },
  protocols: {
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      router02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    },
    camelot: {
      router: "0xc873fEcbd354f5A56E00E710B90EF4201db2448d",
      factory: "0x6EcCab422D763aC031210895C81787E87B43A652",
    },
    aaveV3: {
      pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      oracle: "0xb56c2F0B653B2e0b10C9b928C8580Ac5Df02C7C7",
    },
    gmx: {
      vault: "0x489ee077994B6658eAfA855C308275EAd8097C4A",
      router: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
      positionRouter: "0xb87a436B93fFE9D75c5cFA7bAcFff96430b09868",
      glp: "0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258",
      glpManager: "0x321F653eED006AD1C29D174e17d96351BDe22649",
    },
    chainlink: {
      ETH_USD: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
      BTC_USD: "0x6ce185860a4963106506C203335A2910DCDDB8DB",
      USDC_USD: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
      ARB_USD: "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
    },
  },
};

// ============================================
// POLYGON (Chain ID: 137)
// ============================================
export const POLYGON: ChainAddresses = {
  chainId: 137,
  name: "Polygon",
  tokens: {
    WMATIC: {
      address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      symbol: "WMATIC",
      decimals: 18,
      name: "Wrapped Matic",
    },
    WETH: {
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      symbol: "WETH",
      decimals: 18,
      name: "Wrapped Ether",
    },
    USDC: {
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      symbol: "USDC",
      decimals: 6,
      name: "USD Coin",
    },
    "USDC.e": {
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      symbol: "USDC.e",
      decimals: 6,
      name: "Bridged USDC",
    },
    USDT: {
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      symbol: "USDT",
      decimals: 6,
      name: "Tether USD",
    },
    DAI: {
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      symbol: "DAI",
      decimals: 18,
      name: "Dai Stablecoin",
    },
    WBTC: {
      address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      symbol: "WBTC",
      decimals: 8,
      name: "Wrapped BTC",
    },
    wstETH: {
      address: "0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD",
      symbol: "wstETH",
      decimals: 18,
      name: "Wrapped stETH",
    },
  },
  protocols: {
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      router02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
      positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    },
    quickswap: {
      factory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
      router: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    },
    aaveV3: {
      pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
      poolDataProvider: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
      oracle: "0xb023e699F5a33916Ea823A16485e259257cA8Bd1",
    },
    chainlink: {
      MATIC_USD: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
      ETH_USD: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
      BTC_USD: "0xc907E116054Ad103354f2D350FD2514433D57F6f",
      USDC_USD: "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7",
    },
  },
};

// ============================================
// REGISTRY - All chains indexed
// ============================================
export const CHAIN_REGISTRY: Record<number, ChainAddresses> = {
  1: ETHEREUM_MAINNET,
  8453: BASE,
  10: OPTIMISM,
  42161: ARBITRUM,
  137: POLYGON,
};

export const CHAIN_BY_NAME: Record<string, ChainAddresses> = {
  mainnet: ETHEREUM_MAINNET,
  ethereum: ETHEREUM_MAINNET,
  base: BASE,
  optimism: OPTIMISM,
  arbitrum: ARBITRUM,
  polygon: POLYGON,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get token address by symbol on a chain
 */
export function getTokenAddress(chainId: number, symbol: string): string | null {
  const chain = CHAIN_REGISTRY[chainId];
  if (!chain) return null;
  const token = chain.tokens[symbol];
  return token?.address || null;
}

/**
 * Get protocol addresses on a chain
 */
export function getProtocolAddresses(chainId: number, protocol: string): ProtocolAddresses | null {
  const chain = CHAIN_REGISTRY[chainId];
  if (!chain) return null;
  return chain.protocols[protocol] || null;
}

/**
 * Get all tokens for a chain
 */
export function getChainTokens(chainId: number): Record<string, TokenInfo> | null {
  const chain = CHAIN_REGISTRY[chainId];
  return chain?.tokens || null;
}

/**
 * Search for a token across all chains
 */
export function findToken(symbol: string): Array<{ chainId: number; chainName: string; token: TokenInfo }> {
  const results: Array<{ chainId: number; chainName: string; token: TokenInfo }> = [];
  for (const [chainId, chain] of Object.entries(CHAIN_REGISTRY)) {
    const token = chain.tokens[symbol];
    if (token) {
      results.push({ chainId: parseInt(chainId), chainName: chain.name, token });
    }
  }
  return results;
}
