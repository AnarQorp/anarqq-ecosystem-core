/**
 * Sandbox Wallet Interface Component
 * Provides UI for managing sandbox wallet operations and testing scenarios
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Settings, 
  TestTube, 
  Clock, 
  Wifi, 
  AlertTriangle,
  DollarSign,
  Activity
} from 'lucide-react';
import { useSandboxWallet } from '../../hooks/useSandboxWallet';
import { TestingScenario } from '../../services/identity/SandboxWalletService';

interface SandboxWalletInterfaceProps {
  className?: string;
}

export function SandboxWalletInterface({ className }: SandboxWalletInterfaceProps) {
  const {
    isActive,
    sandboxState,
    currentScenario,
    mockBalances,
    mockTransactions,
    availableScenarios,
    enableSandbox,
    disableSandbox,
    resetSandbox,
    setMockBalances,
    addMockTransaction,
    startScenario,
    stopScenario,
    setSimulatedTime,
    setNetworkDelay,
    enableErrorSimulation,
    disableErrorSimulation,
    simulateTransaction,
    loading,
    error
  } = useSandboxWallet();

  // Local state for forms
  const [newBalances, setNewBalances] = useState<Record<string, string>>({});
  const [simulatedTime, setSimulatedTimeLocal] = useState('');
  const [networkDelay, setNetworkDelayLocal] = useState('100');
  const [errorRate, setErrorRate] = useState('0.1');
  const [errorTypes, setErrorTypes] = useState<string[]>(['NETWORK_ERROR']);
  const [transactionForm, setTransactionForm] = useState({
    type: 'SEND',
    amount: '',
    token: 'QToken',
    to: 'test_recipient'
  });

  const handleEnableSandbox = async () => {
    await enableSandbox({
      mockBalances: { QToken: 1000, ETH: 10, USDC: 5000 },
      debugLogging: true,
      allowReset: true
    });
  };

  const handleSetMockBalances = async () => {
    const balances: Record<string, number> = {};
    for (const [token, amount] of Object.entries(newBalances)) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount >= 0) {
        balances[token] = numAmount;
      }
    }
    
    if (Object.keys(balances).length > 0) {
      await setMockBalances(balances);
      setNewBalances({});
    }
  };

  const handleSimulateTransaction = async () => {
    const amount = parseFloat(transactionForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    const result = await simulateTransaction({
      type: transactionForm.type,
      amount,
      token: transactionForm.token,
      to: transactionForm.to
    });

    if (!result.success) {
      console.error('Transaction simulation failed:', result.error);
    }
  };

  const handleSetSimulatedTime = async () => {
    if (simulatedTime) {
      await setSimulatedTime(simulatedTime);
    }
  };

  const handleSetNetworkDelay = async () => {
    const delay = parseInt(networkDelay);
    if (!isNaN(delay) && delay >= 0) {
      await setNetworkDelay(delay);
    }
  };

  const handleToggleErrorSimulation = async (enabled: boolean) => {
    if (enabled) {
      const rate = parseFloat(errorRate);
      if (!isNaN(rate) && rate >= 0 && rate <= 1) {
        await enableErrorSimulation(rate, errorTypes);
      }
    } else {
      await disableErrorSimulation();
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 animate-spin" />
            <span>Loading sandbox...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TestTube className="h-5 w-5" />
          <span>Sandbox Wallet</span>
          {isActive && (
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          )}
          {currentScenario && (
            <Badge variant="outline" className="ml-2">
              {currentScenario}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isActive ? (
          <div className="text-center py-8">
            <TestTube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sandbox Mode Disabled</h3>
            <p className="text-muted-foreground mb-4">
              Enable sandbox mode to test wallet operations safely without real funds.
            </p>
            <Button onClick={handleEnableSandbox} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Enable Sandbox
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Mock Balances</span>
                    </div>
                    <div className="mt-2">
                      {mockBalances ? (
                        Object.entries(mockBalances).map(([token, balance]) => (
                          <div key={token} className="flex justify-between text-sm">
                            <span>{token}:</span>
                            <span>{balance.balance.toFixed(2)}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No balances</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Transactions</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{mockTransactions.length}</span>
                      <span className="text-sm text-muted-foreground ml-2">total</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Wifi className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Network Delay</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{sandboxState?.networkDelay || 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">ms</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex space-x-2">
                <Button onClick={resetSandbox} variant="outline" disabled={loading}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={disableSandbox} variant="destructive" disabled={loading}>
                  <Square className="h-4 w-4 mr-2" />
                  Disable Sandbox
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="balances" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Current Mock Balances</h3>
                {mockBalances && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(mockBalances).map(([token, balance]) => (
                      <Card key={token}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{token}</span>
                            <div className="text-right">
                              <div className="text-lg font-bold">{balance.balance.toFixed(2)}</div>
                              {balance.locked > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Locked: {balance.locked.toFixed(2)}
                                </div>
                              )}
                              {balance.staked > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Staked: {balance.staked.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-medium">Set New Balances</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['QToken', 'ETH', 'USDC', 'BTC'].map((token) => (
                      <div key={token} className="space-y-2">
                        <Label htmlFor={`balance-${token}`}>{token}</Label>
                        <Input
                          id={`balance-${token}`}
                          type="number"
                          placeholder="0.00"
                          value={newBalances[token] || ''}
                          onChange={(e) => setNewBalances(prev => ({
                            ...prev,
                            [token]: e.target.value
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSetMockBalances} disabled={loading}>
                    Update Balances
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Simulate Transaction</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tx-type">Type</Label>
                    <Select
                      value={transactionForm.type}
                      onValueChange={(value) => setTransactionForm(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEND">Send</SelectItem>
                        <SelectItem value="RECEIVE">Receive</SelectItem>
                        <SelectItem value="STAKE">Stake</SelectItem>
                        <SelectItem value="UNSTAKE">Unstake</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-token">Token</Label>
                    <Select
                      value={transactionForm.token}
                      onValueChange={(value) => setTransactionForm(prev => ({ ...prev, token: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QToken">QToken</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                        <SelectItem value="USDC">USDC</SelectItem>
                        <SelectItem value="BTC">BTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-amount">Amount</Label>
                    <Input
                      id="tx-amount"
                      type="number"
                      placeholder="0.00"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tx-to">To Address</Label>
                    <Input
                      id="tx-to"
                      placeholder="recipient_address"
                      value={transactionForm.to}
                      onChange={(e) => setTransactionForm(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                </div>
                <Button onClick={handleSimulateTransaction} disabled={loading}>
                  Simulate Transaction
                </Button>

                <div className="space-y-2">
                  <h4 className="font-medium">Recent Transactions</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {mockTransactions.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No transactions yet</p>
                    ) : (
                      mockTransactions.slice(-10).reverse().map((tx) => (
                        <Card key={tx.id}>
                          <CardContent className="p-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{tx.type}</span>
                                <span className="text-muted-foreground ml-2">
                                  {tx.amount} {tx.token}
                                </span>
                              </div>
                              <Badge variant={tx.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                                {tx.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {new Date(tx.timestamp).toLocaleString()}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="scenarios" className="space-y-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Testing Scenarios</h3>
                  {currentScenario && (
                    <Button onClick={stopScenario} variant="outline" size="sm">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Scenario
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableScenarios.map((scenario) => (
                    <Card key={scenario.name}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">{scenario.name}</h4>
                            {currentScenario === scenario.name && (
                              <Badge variant="default">Running</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {scenario.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Duration: {scenario.duration || 'Unlimited'} minutes
                          </div>
                          <Button
                            size="sm"
                            onClick={() => startScenario(scenario.name)}
                            disabled={currentScenario === scenario.name || loading}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Simulation Settings</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="simulated-time">Simulated Time</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="simulated-time"
                        type="datetime-local"
                        value={simulatedTime}
                        onChange={(e) => setSimulatedTimeLocal(e.target.value)}
                      />
                      <Button onClick={handleSetSimulatedTime} disabled={loading}>
                        <Clock className="h-4 w-4 mr-2" />
                        Set
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="network-delay">Network Delay (ms)</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="network-delay"
                        type="number"
                        value={networkDelay}
                        onChange={(e) => setNetworkDelayLocal(e.target.value)}
                      />
                      <Button onClick={handleSetNetworkDelay} disabled={loading}>
                        <Wifi className="h-4 w-4 mr-2" />
                        Set
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="error-simulation"
                        checked={sandboxState?.errorSimulation.enabled || false}
                        onCheckedChange={handleToggleErrorSimulation}
                      />
                      <Label htmlFor="error-simulation">Error Simulation</Label>
                    </div>
                    
                    {sandboxState?.errorSimulation.enabled && (
                      <div className="space-y-2 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="error-rate">Error Rate (0-1)</Label>
                          <Input
                            id="error-rate"
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={errorRate}
                            onChange={(e) => setErrorRate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}