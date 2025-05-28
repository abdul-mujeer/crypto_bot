import pandas as pd
import numpy as np
from datetime import datetime
import uuid
import logging
import json
from typing import Dict, List, Optional, Union

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VirtualTradingAccount:
    def __init__(self, initial_balance: float = 10000.0, storage=None):
        """
        Initialize a virtual trading account
        
        Args:
            initial_balance: Initial USD balance
            storage: Storage instance for persisting data
        """
        self.initial_balance = initial_balance
        self.storage = storage
        self.balances = {"USDT": initial_balance}  # Default balance in USDT
        self.open_orders = []
        self.order_history = []
        self.trades = []
        
        # Load existing data if available
        self._load_account_data()
    
    def _load_account_data(self):
        """Load account data from storage if available"""
        if not self.storage:
            return
            
        try:
            # Try to load balances
            balances_df = self.storage.query_virtual_balances()
            if not balances_df.empty:
                self.balances = {}
                for _, row in balances_df.iterrows():
                    self.balances[row['currency']] = row['amount']
            
            # Try to load order history
            orders_df = self.storage.query_virtual_orders()
            if not orders_df.empty:
                self.order_history = orders_df.to_dict('records')
                
            # Try to load trades
            trades_df = self.storage.query_virtual_trades()
            if not trades_df.empty:
                self.trades = trades_df.to_dict('records')
                
            logger.info(f"Loaded account data: {len(self.balances)} currencies, {len(self.order_history)} orders, {len(self.trades)} trades")
        except Exception as e:
            logger.error(f"Error loading account data: {e}")
    
    def get_balance(self, currency: str = "USDT") -> float:
        """
        Get balance for a specific currency
        
        Args:
            currency: Currency code
            
        Returns:
            float: Balance amount
        """
        return self.balances.get(currency, 0.0)
    
    def get_all_balances(self) -> Dict[str, float]:
        """
        Get all balances
        
        Returns:
            Dict[str, float]: Dictionary of currency balances
        """
        return self.balances
    
    def get_portfolio_value(self, current_prices: Dict[str, float]) -> Dict:
        """
        Calculate total portfolio value based on current prices
        
        Args:
            current_prices: Dictionary of current prices (symbol -> price)
            
        Returns:
            Dict: Portfolio summary
        """
        total_value = self.balances.get("USDT", 0.0)
        holdings = []
        
        for currency, amount in self.balances.items():
            if currency == "USDT":
                continue
                
            symbol = f"{currency}/USDT"
            price = current_prices.get(symbol, 0.0)
            value = amount * price
            total_value += value
            
            holdings.append({
                "currency": currency,
                "amount": amount,
                "price": price,
                "value": value
            })
        
        # Calculate performance metrics
        initial_value = self.initial_balance
        profit_loss = total_value - initial_value
        profit_loss_pct = (profit_loss / initial_value) * 100 if initial_value > 0 else 0
        
        return {
            "total_value": total_value,
            "holdings": holdings,
            "usdt_balance": self.balances.get("USDT", 0.0),
            "profit_loss": profit_loss,
            "profit_loss_pct": profit_loss_pct,
            "initial_value": initial_value
        }
    
    def place_order(self, symbol: str, order_type: str, amount: float, price: float = None) -> Dict:
        """
        Place a virtual order
        
        Args:
            symbol: Trading symbol (e.g., "BTC/USDT")
            order_type: Order type ("BUY" or "SELL")
            amount: Amount to buy/sell
            price: Price to buy/sell at (None for market orders)
            
        Returns:
            Dict: Order details
        """
        try:
            # Parse the symbol
            base_currency, quote_currency = symbol.split('/')
            
            # Validate order
            if order_type not in ["BUY", "SELL"]:
                return {"success": False, "message": "Invalid order type. Use 'BUY' or 'SELL'."}
            
            if amount <= 0:
                return {"success": False, "message": "Amount must be positive."}
            
            # For market orders, we need a price
            if price is None:
                return {"success": False, "message": "Price is required for virtual trading."}
            
            # Check if we have enough balance
            if order_type == "BUY":
                required_balance = amount * price
                if self.balances.get(quote_currency, 0) < required_balance:
                    return {"success": False, "message": f"Insufficient {quote_currency} balance."}
            else:  # SELL
                if self.balances.get(base_currency, 0) < amount:
                    return {"success": False, "message": f"Insufficient {base_currency} balance."}
            
            # Create order
            order_id = str(uuid.uuid4())
            timestamp = datetime.now()
            order = {
                "id": order_id,
                "timestamp": timestamp,
                "symbol": symbol,
                "type": order_type,
                "amount": amount,
                "price": price,
                "status": "EXECUTED",  # For simplicity, we execute immediately
                "cost": amount * price,
                "fee": amount * price * 0.001  # 0.1% fee
            }
            
            # Execute order (update balances)
            if order_type == "BUY":
                # Deduct quote currency (e.g., USDT)
                self.balances[quote_currency] = self.balances.get(quote_currency, 0) - order["cost"] - order["fee"]
                # Add base currency (e.g., BTC)
                self.balances[base_currency] = self.balances.get(base_currency, 0) + amount
            else:  # SELL
                # Deduct base currency
                self.balances[base_currency] = self.balances.get(base_currency, 0) - amount
                # Add quote currency
                self.balances[quote_currency] = self.balances.get(quote_currency, 0) + order["cost"] - order["fee"]
            
            # Add to order history
            self.order_history.append(order)
            
            # Add to trades
            trade = {
                "id": str(uuid.uuid4()),
                "order_id": order_id,
                "timestamp": timestamp,
                "symbol": symbol,
                "type": order_type,
                "amount": amount,
                "price": price,
                "cost": order["cost"],
                "fee": order["fee"]
            }
            self.trades.append(trade)
            
            # Save to storage if available
            if self.storage:
                try:
                    # Save order
                    order_df = pd.DataFrame([order])
                    self.storage.store_virtual_order(order_df)
                    
                    # Save trade
                    trade_df = pd.DataFrame([trade])
                    self.storage.store_virtual_trade(trade_df)
                    
                    # Save updated balances
                    balance_records = []
                    for currency, amount in self.balances.items():
                        balance_records.append({
                            "timestamp": timestamp,
                            "currency": currency,
                            "amount": amount
                        })
                    balance_df = pd.DataFrame(balance_records)
                    self.storage.store_virtual_balances(balance_df)
                except Exception as e:
                    logger.error(f"Error saving order data: {e}")
            
            return {
                "success": True,
                "message": f"{order_type} order executed successfully.",
                "order": order
            }
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return {"success": False, "message": f"Error placing order: {str(e)}"}
    
    def get_order_history(self, symbol: str = None, limit: int = 50) -> List[Dict]:
        """
        Get order history
        
        Args:
            symbol: Filter by symbol (optional)
            limit: Maximum number of orders to return
            
        Returns:
            List[Dict]: List of orders
        """
        if symbol:
            filtered_orders = [order for order in self.order_history if order["symbol"] == symbol]
        else:
            filtered_orders = self.order_history
        
        # Sort by timestamp (newest first)
        sorted_orders = sorted(filtered_orders, key=lambda x: x["timestamp"], reverse=True)
        
        # Limit the number of orders
        return sorted_orders[:limit]
    
    def get_trades(self, symbol: str = None, limit: int = 50) -> List[Dict]:
        """
        Get trade history
        
        Args:
            symbol: Filter by symbol (optional)
            limit: Maximum number of trades to return
            
        Returns:
            List[Dict]: List of trades
        """
        if symbol:
            filtered_trades = [trade for trade in self.trades if trade["symbol"] == symbol]
        else:
            filtered_trades = self.trades
        
        # Sort by timestamp (newest first)
        sorted_trades = sorted(filtered_trades, key=lambda x: x["timestamp"], reverse=True)
        
        # Limit the number of trades
        return sorted_trades[:limit]
    
    def reset_account(self) -> Dict:
        """
        Reset the account to initial state
        
        Returns:
            Dict: Status message
        """
        self.balances = {"USDT": self.initial_balance}
        self.open_orders = []
        self.order_history = []
        self.trades = []
        
        # Clear data in storage if available
        if self.storage:
            try:
                self.storage.clear_virtual_trading_data()
                
                # Save initial balance
                balance_records = [{
                    "timestamp": datetime.now(),
                    "currency": "USDT",
                    "amount": self.initial_balance
                }]
                balance_df = pd.DataFrame(balance_records)
                self.storage.store_virtual_balances(balance_df)
            except Exception as e:
                logger.error(f"Error clearing account data: {e}")
        
        return {"success": True, "message": "Account reset successfully."}
