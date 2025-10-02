
// File: @chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol


pragma solidity ^0.8.0;

interface AggregatorV3Interface {
  function decimals() external view returns (uint8);

  function description() external view returns (string memory);

  function version() external view returns (uint256);

  function getRoundData(
    uint80 _roundId
  ) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

  function latestRoundData()
    external
    view
    returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

// File: contracts/MockPriceFeed.sol


pragma solidity ^0.8.28;


/**
 * @title MockPriceFeed
 * @dev 模拟Chainlink价格预言机，用于测试
 */
contract MockPriceFeed is AggregatorV3Interface {
    uint8 public override decimals;
    string public override description;
    uint256 public override version = 1;
    
    int256 private _price;
    uint256 private _updatedAt;
    uint80 private _roundId;
    
    constructor(
        uint8 _decimals,
        string memory _description,
        int256 _initialPrice
    ) {
        decimals = _decimals;
        description = _description;
        _price = _initialPrice;
        _updatedAt = block.timestamp;
        _roundId = 1;
    }
    
    function getRoundData(uint80 roundIdParam)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }
    
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }
    
    function updatePrice(int256 _newPrice) external {
        _price = _newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
    }
    
    function getPrice() external view returns (int256) {
        return _price;
    }
}
