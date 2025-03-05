import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import Select from "react-select";
import { Moon, Sun, RefreshCw, Menu, X } from "lucide-react";
import allTokens from "./tokens";

// Network configuration (Ethereum mainnet only)
const NETWORK = {
  id: "ethereum",
  name: "Ethereum",
  chainId: 1,
  rpc: "https://rpc.ankr.com/eth",
  quoterAddress: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6", // Uniswap V3 Quoter
};

// Uniswap V3 Quoter ABI (simplified for quoteExactInputSingle)
const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external view returns (uint256 amountOut)",
];

// Optimized high-liquidity tokens
const HIGH_LIQUIDITY_TOKENS = allTokens
  .filter((t) => t.network === "ethereum")
  .filter((t) =>
    [
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
      "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
      "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
      "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", // MATIC
    ].includes(t.address)
  );

// ErrorBanner Component
const ErrorBanner = ({
  error,
  suggestion,
  onSuggestionClick,
}: {
  error: string;
  suggestion: {
    tokens: { token1: any; token2: any; token3: any };
    profit: number;
  } | null;
  onSuggestionClick: (suggestedTokens: {
    token1: any;
    token2: any;
    token3: any;
  }) => void;
}) => {
  let displayMessage = "Something went wrong.";
  if (error.includes("Step 1"))
    displayMessage = "No trading path available for this pair.";
  else if (error.includes("Step 2"))
    displayMessage = "This pair can't be traded right now.";
  else if (error.includes("Step 3"))
    displayMessage = "Unable to complete the arbitrage loop.";

  return (
    <div className="bg-red-900/20 border-l-4 border-red-500 p-3 rounded-lg mb-4 text-sm text-red-300 dark:bg-red-900/30 animate-fade-in">
      <p className="font-medium">{displayMessage}</p>
      {suggestion && (
        <button
          onClick={() => onSuggestionClick(suggestion.tokens)}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors w-full text-left"
        >
          Try this: {suggestion.tokens.token1.symbol} →{" "}
          {suggestion.tokens.token2.symbol} → {suggestion.tokens.token3.symbol}
          <span className="ml-1 text-green-300">
            (Profit: {suggestion.profit.toFixed(4)})
          </span>
        </button>
      )}
    </div>
  );
};

// SuggestionList Component (Modal)
const SuggestionList = ({
  suggestions,
  onSuggestionClick,
  onClose,
}: {
  suggestions: {
    tokens: { token1: any; token2: any; token3: any };
    profit: number;
  }[];
  onSuggestionClick: (suggestedTokens: {
    token1: any;
    token2: any;
    token3: any;
  }) => void;
  onClose: () => void;
}) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300"
    onClick={onClose} // Close when clicking outside
  >
    <div
      className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-w-md max-h-[80vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-95 animate-fade-in-up"
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
    >
      <h2 className="text-xl font-semibold dark:text-white mb-4">
        Profitable Suggestions
      </h2>
      <div className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestionClick(suggestion.tokens)}
            className="w-full text-left p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm dark:text-white"
          >
            {suggestion.tokens.token1.symbol} →{" "}
            {suggestion.tokens.token2.symbol} →{" "}
            {suggestion.tokens.token3.symbol}
            <span className="ml-2 text-green-600 dark:text-green-300">
              (Profit: {suggestion.profit.toFixed(4)})
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-6 w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm font-medium"
      >
        Close
      </button>
    </div>
  </div>
);

// Main App Component
const App = () => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return (
      savedTheme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  });

  const [arbitrageData, setArbitrageData] = useState({
    initialAmount: 1,
    finalAmount: 0,
    profit: 0,
    loading: false,
    errors: { step1: "", step2: "", step3: "" },
    debug: [] as string[],
  });

  const [tokens, setTokens] = useState({
    token1: HIGH_LIQUIDITY_TOKENS[0],
    token2: HIGH_LIQUIDITY_TOKENS[1],
    token3: HIGH_LIQUIDITY_TOKENS[2],
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [profitableTrios, setProfitableTrios] = useState<
    { tokens: { token1: any; token2: any; token3: any }; profit: number }[]
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

  const fee = 3000; // 0.3% fee tier for Uniswap V3 pools

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const getProviderAndQuoter = () => {
    const provider = new ethers.JsonRpcProvider(NETWORK.rpc);
    const quoter = new ethers.Contract(
      NETWORK.quoterAddress,
      QUOTER_ABI,
      provider
    );
    return { provider, quoter };
  };

  useEffect(() => {
    const cachedTrios = localStorage.getItem("profitableTrios");
    if (cachedTrios) {
      setProfitableTrios(JSON.parse(cachedTrios));
      setIsLoadingSuggestions(false);
      return;
    }

    const calculateProfitableTrios = async () => {
      setIsLoadingSuggestions(true);
      const { quoter } = getProviderAndQuoter();
      const trios: {
        tokens: { token1: any; token2: any; token3: any };
        profit: number;
      }[] = [];

      for (let i = 0; i < HIGH_LIQUIDITY_TOKENS.length - 2; i++) {
        for (let j = i + 1; j < HIGH_LIQUIDITY_TOKENS.length - 1; j++) {
          for (let k = j + 1; k < HIGH_LIQUIDITY_TOKENS.length; k++) {
            const token1 = HIGH_LIQUIDITY_TOKENS[i];
            const token2 = HIGH_LIQUIDITY_TOKENS[j];
            const token3 = HIGH_LIQUIDITY_TOKENS[k];
            const amountIn = ethers.parseUnits("1", token1.decimals);

            try {
              const amountOut1 = await quoter.quoteExactInputSingle(
                token1.address,
                token2.address,
                fee,
                amountIn,
                0
              );
              const amountOut2 = await quoter.quoteExactInputSingle(
                token2.address,
                token3.address,
                fee,
                amountOut1,
                0
              );
              const amountOut3 = await quoter.quoteExactInputSingle(
                token3.address,
                token1.address,
                fee,
                amountOut2,
                0
              );

              const initialAmount = parseFloat(
                ethers.formatUnits(amountIn, token1.decimals)
              );
              const finalAmount = parseFloat(
                ethers.formatUnits(amountOut3, token1.decimals)
              );
              const profit = finalAmount - initialAmount;

              if (profit > -1) {
                trios.push({ tokens: { token1, token2, token3 }, profit });
              }
            } catch (error) {
              continue;
            }
          }
        }
      }

      trios.sort((a, b) => b.profit - a.profit);
      const topTrios = trios.slice(0, 5);
      setProfitableTrios(topTrios);
      localStorage.setItem("profitableTrios", JSON.stringify(topTrios));
      setIsLoadingSuggestions(false);
    };

    calculateProfitableTrios();
  }, []);

  const checkTriangularArbitrage = async () => {
    setArbitrageData((prev) => ({
      ...prev,
      loading: true,
      errors: { step1: "", step2: "", step3: "" },
      debug: [],
    }));
    try {
      const { quoter } = getProviderAndQuoter();
      const adjustedAmountIn = ethers.parseUnits("1", tokens.token1.decimals);

      let amountOut1;
      try {
        amountOut1 = await quoter.quoteExactInputSingle(
          tokens.token1.address,
          tokens.token2.address,
          fee,
          adjustedAmountIn,
          0
        );
        setArbitrageData((prev) => ({
          ...prev,
          debug: [
            ...prev.debug,
            `${tokens.token1.symbol} -> ${
              tokens.token2.symbol
            }: ${ethers.formatUnits(amountOut1, tokens.token2.decimals)} ${
              tokens.token2.symbol
            }`,
          ],
        }));
      } catch (error: any) {
        throw new Error(
          `Step 1 (${tokens.token1.symbol} -> ${tokens.token2.symbol}) failed: ${error.message}`
        );
      }

      let amountOut2;
      try {
        amountOut2 = await quoter.quoteExactInputSingle(
          tokens.token2.address,
          tokens.token3.address,
          fee,
          amountOut1,
          0
        );
        setArbitrageData((prev) => ({
          ...prev,
          debug: [
            ...prev.debug,
            `${tokens.token2.symbol} -> ${
              tokens.token3.symbol
            }: ${ethers.formatUnits(amountOut2, tokens.token3.decimals)} ${
              tokens.token3.symbol
            }`,
          ],
        }));
      } catch (error: any) {
        throw new Error(
          `Step 2 (${tokens.token2.symbol} -> ${tokens.token3.symbol}) failed: ${error.message}`
        );
      }

      let amountOut3;
      try {
        amountOut3 = await quoter.quoteExactInputSingle(
          tokens.token3.address,
          tokens.token1.address,
          fee,
          amountOut2,
          0
        );
        setArbitrageData((prev) => ({
          ...prev,
          debug: [
            ...prev.debug,
            `${tokens.token3.symbol} -> ${
              tokens.token1.symbol
            }: ${ethers.formatUnits(amountOut3, tokens.token1.decimals)} ${
              tokens.token1.symbol
            }`,
          ],
        }));
      } catch (error: any) {
        throw new Error(
          `Step 3 (${tokens.token3.symbol} -> ${tokens.token1.symbol}) failed: ${error.message}`
        );
      }

      const initialAmount = parseFloat(
        ethers.formatUnits(adjustedAmountIn, tokens.token1.decimals)
      );
      const finalAmount = parseFloat(
        ethers.formatUnits(amountOut3, tokens.token1.decimals)
      );
      const profit = finalAmount - initialAmount;

      setArbitrageData((prev) => ({
        ...prev,
        initialAmount,
        finalAmount,
        profit,
        loading: false,
        errors: { step1: "", step2: "", step3: "" },
      }));
    } catch (error: any) {
      const message = error.message;
      setArbitrageData((prev) => ({
        ...prev,
        loading: false,
        errors: {
          step1: message.includes("Step 1") ? message : "",
          step2: message.includes("Step 2") ? message : "",
          step3: message.includes("Step 3") ? message : "",
        },
      }));
    }
  };

  useEffect(() => {
    checkTriangularArbitrage();
    const interval = setInterval(checkTriangularArbitrage, 30000);
    return () => clearInterval(interval);
  }, [tokens]);

  const handleTokenChange = (
    key: "token1" | "token2" | "token3",
    selectedOption: any
  ) => {
    const selectedToken = HIGH_LIQUIDITY_TOKENS.find(
      (t) => t.address === selectedOption.value
    )!;
    setTokens((prev) => ({ ...prev, [key]: selectedToken }));
  };

  const resetTokens = () => {
    setTokens({
      token1: HIGH_LIQUIDITY_TOKENS[0],
      token2: HIGH_LIQUIDITY_TOKENS[1],
      token3: HIGH_LIQUIDITY_TOKENS[2],
    });
    setMenuOpen(false);
  };

  const applySuggestion = (suggestedTokens: {
    token1: any;
    token2: any;
    token3: any;
  }) => {
    setTokens(suggestedTokens);
    setShowSuggestionModal(false);
    setArbitrageData((prev) => ({
      ...prev,
      errors: { step1: "", step2: "", step3: "" },
      debug: [],
    }));
    checkTriangularArbitrage();
  };

  const tokenOptions = HIGH_LIQUIDITY_TOKENS.map((token) => ({
    value: token.address,
    label: `${token.symbol} (${token.address.slice(0, 6)}...)`,
  }));

  const customStyles = {
    control: (provided: any) => ({
      ...provided,
      backgroundColor: theme === "dark" ? "#1F2937" : "#F3F4F6",
      borderColor: theme === "dark" ? "#4B5563" : "#D1D5DB",
      color: theme === "dark" ? "white" : "black",
      padding: "4px",
      borderRadius: "8px",
      fontSize: "14px",
      minHeight: "48px",
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: theme === "dark" ? "#1F2937" : "#F3F4F6",
      borderRadius: "8px",
      zIndex: 9999,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#3B82F6"
        : state.isFocused
        ? theme === "dark"
          ? "#374151"
          : "#E5E7EB"
        : theme === "dark"
        ? "#1F2937"
        : "#F3F4F6",
      color: theme === "dark" ? "white" : "black",
      padding: "10px",
      fontSize: "14px",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: theme === "dark" ? "white" : "black",
    }),
    input: (provided: any) => ({
      ...provided,
      color: theme === "dark" ? "white" : "black",
    }),
  };

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black"
      } transition-colors duration-300`}
    >
      {/* Header with Theme Toggle and Menu Toggle */}
      <header className="sticky top-0 z-20 bg-gray-800 text-white px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <h1 className="text-xl font-bold">Arbitrage Monitor</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </header>

      {/* Overlay for Closing Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar Menu */}
      <div
        className={`fixed inset-y-0 left-0 w-64 md:w-72 lg:w-80 bg-gray-800 transform ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out z-30 shadow-lg`}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Menu</h2>
          <button
            onClick={resetTokens}
            className="w-full py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors text-sm disabled:opacity-50"
            disabled={arbitrageData.loading}
          >
            Reset Tokens
          </button>
          <button
            onClick={() => {
              checkTriangularArbitrage();
              setMenuOpen(false);
            }}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-600 transition-colors text-sm flex items-center justify-center disabled:opacity-50"
            disabled={arbitrageData.loading}
          >
            <RefreshCw className="mr-2 w-4 h-4" /> Refresh Now
          </button>
          <button
            onClick={() => setShowSuggestionModal(true)}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-600 transition-colors text-sm disabled:opacity-50"
            disabled={isLoadingSuggestions || arbitrageData.loading}
          >
            Show Suggestions
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-md mx-auto md:max-w-lg lg:max-w-xl xl:max-w-2xl space-y-6">
        {/* Loading Suggestions Indicator */}
        {isLoadingSuggestions && (
          <div className="text-center text-gray-400 flex items-center justify-center bg-gray-800 p-3 rounded-lg animate-pulse">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-blue-500"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Finding Profitable Pairs...
          </div>
        )}

        {/* Token Selection */}
        {!isLoadingSuggestions && (
          <div className="bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="space-y-4">
              <Select
                options={tokenOptions.filter(
                  (option) =>
                    ![tokens.token2?.address, tokens.token3?.address]
                      .filter(Boolean)
                      .includes(option.value) ||
                    option.value === tokens.token1?.address
                )}
                value={
                  tokenOptions.find(
                    (option) => option.value === tokens.token1?.address
                  ) || null
                }
                onChange={(option) => handleTokenChange("token1", option)}
                styles={customStyles}
                placeholder="Token 1"
                isSearchable
                isDisabled={arbitrageData.loading}
              />
              {arbitrageData.errors.step1 && (
                <ErrorBanner
                  error={arbitrageData.errors.step1}
                  suggestion={profitableTrios[0]}
                  onSuggestionClick={applySuggestion}
                />
              )}
              <Select
                options={tokenOptions.filter(
                  (option) =>
                    ![tokens.token1?.address, tokens.token3?.address]
                      .filter(Boolean)
                      .includes(option.value) ||
                    option.value === tokens.token2?.address
                )}
                value={
                  tokenOptions.find(
                    (option) => option.value === tokens.token2?.address
                  ) || null
                }
                onChange={(option) => handleTokenChange("token2", option)}
                styles={customStyles}
                placeholder="Token 2"
                isSearchable
                isDisabled={arbitrageData.loading}
              />
              {arbitrageData.errors.step2 && (
                <ErrorBanner
                  error={arbitrageData.errors.step2}
                  suggestion={profitableTrios[0]}
                  onSuggestionClick={applySuggestion}
                />
              )}
              <Select
                options={tokenOptions.filter(
                  (option) =>
                    ![tokens.token1?.address, tokens.token2?.address]
                      .filter(Boolean)
                      .includes(option.value) ||
                    option.value === tokens.token3?.address
                )}
                value={
                  tokenOptions.find(
                    (option) => option.value === tokens.token3?.address
                  ) || null
                }
                onChange={(option) => handleTokenChange("token3", option)}
                styles={customStyles}
                placeholder="Token 3"
                isSearchable
                isDisabled={arbitrageData.loading}
              />
              {arbitrageData.errors.step3 && (
                <ErrorBanner
                  error={arbitrageData.errors.step3}
                  suggestion={profitableTrios[0]}
                  onSuggestionClick={applySuggestion}
                />
              )}
            </div>
          </div>
        )}

        {/* Results Display */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Starting</span>
              <span className="text-base font-semibold text-white">
                {arbitrageData.initialAmount.toFixed(4)}{" "}
                {tokens.token1?.symbol || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Final</span>
              <span className="text-base font-semibold text-white">
                {arbitrageData.finalAmount.toFixed(4)}{" "}
                {tokens.token1?.symbol || "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Profit</span>
              <span
                className={`text-base font-semibold ${
                  arbitrageData.profit > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {arbitrageData.profit.toFixed(4)}{" "}
                {tokens.token1?.symbol || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {arbitrageData.loading && (
          <div className="text-center text-gray-400 flex items-center justify-center bg-gray-800 p-3 rounded-lg animate-pulse">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-blue-500"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Calculating...
          </div>
        )}

        {/* Debug Log */}
        {arbitrageData.debug.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 shadow-md">
            <p className="text-sm text-gray-400 mb-2">Debug Log</p>
            <ul className="space-y-1 text-xs text-gray-300">
              {arbitrageData.debug.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <SuggestionList
          suggestions={profitableTrios}
          onSuggestionClick={applySuggestion}
          onClose={() => setShowSuggestionModal(false)}
        />
      )}
    </div>
  );
};

export default App;
