/**
 * Emergency Controls Dashboard Component
 * 
 * Provides a comprehensive interface for managing emergency wallet controls including:
 * - Wallet freeze/unfreeze status and controls
 * - Emergency contact management
 * - Administrative override management
 * - Emergency action approvals
 * - Emergency notifications
 */

import React, { useState } from 'react';
import { AlertTriangle, Shield, Users, Settings, Bell, Lock, Unlock, Plus, X, Check, AlertCircle } from 'lucide-react';
import { ExtendedSquidIdentity } from '../../types/identity';
import { useEmergencyControls } from '../../hooks/useEmergencyControls';
import { 
  EmergencyContact, 
  EmergencyAction, 
  AdministrativeOverride,
  WalletFreezeStatus 
} from '../../services/identity/EmergencyControlsService';

interface EmergencyControlsDashboardProps {
  identity: ExtendedSquidIdentity;
  className?: string;
}

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (contact: Omit<EmergencyContact, 'id' | 'createdAt'>) => Promise<void>;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    contactId: '',
    contactType: 'TRUSTED_USER' as EmergencyContact['contactType'],
    name: '',
    email: '',
    phone: '',
    priority: 1,
    canUnfreeze: false,
    canOverride: false,
    notificationMethods: ['IN_APP'] as EmergencyContact['notificationMethods']
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onAdd({
        ...formData,
        identityId: '', // Will be set by the service
        isActive: true
      });
      onClose();
      setFormData({
        contactId: '',
        contactType: 'TRUSTED_USER',
        name: '',
        email: '',
        phone: '',
        priority: 1,
        canUnfreeze: false,
        canOverride: false,
        notificationMethods: ['IN_APP']
      });
    } catch (error) {
      console.error('Error adding contact:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Emergency Contact</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Identity ID
            </label>
            <input
              type="text"
              value={formData.contactId}
              onChange={(e) => setFormData(prev => ({ ...prev, contactId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Type
            </label>
            <select
              value={formData.contactType}
              onChange={(e) => setFormData(prev => ({ ...prev, contactType: e.target.value as EmergencyContact['contactType'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GUARDIAN">Guardian</option>
              <option value="ADMIN">Admin</option>
              <option value="TRUSTED_USER">Trusted User</option>
              <option value="SUPPORT">Support</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority (1 = Highest)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.canUnfreeze}
                onChange={(e) => setFormData(prev => ({ ...prev, canUnfreeze: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Can unfreeze wallet</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.canOverride}
                onChange={(e) => setFormData(prev => ({ ...prev, canOverride: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Can create overrides</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EmergencyControlsDashboard: React.FC<EmergencyControlsDashboardProps> = ({ 
  identity, 
  className = '' 
}) => {
  const {
    freezeStatus,
    emergencyContacts,
    pendingActions,
    activeOverrides,
    loading,
    error,
    addEmergencyContact,
    removeEmergencyContact,
    freezeWallet,
    unfreezeWallet,
    requestUnfreezeApproval,
    approveEmergencyAction,
    revokeAdminOverride,
    refreshData
  } = useEmergencyControls(identity);

  const [activeTab, setActiveTab] = useState<'status' | 'contacts' | 'actions' | 'overrides'>('status');
  const [showAddContact, setShowAddContact] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [showFreezeModal, setShowFreezeModal] = useState(false);

  const handleFreezeWallet = async () => {
    if (!freezeReason.trim()) return;
    
    const success = await freezeWallet(freezeReason, 'MANUAL');
    if (success) {
      setShowFreezeModal(false);
      setFreezeReason('');
    }
  };

  const handleUnfreezeWallet = async () => {
    await unfreezeWallet();
  };

  const handleAddContact = async (contactData: Omit<EmergencyContact, 'id' | 'createdAt'>) => {
    await addEmergencyContact(contactData);
    setShowAddContact(false);
  };

  const handleRemoveContact = async (contactId: string) => {
    if (confirm('Are you sure you want to remove this emergency contact?')) {
      await removeEmergencyContact(contactId);
    }
  };

  const handleApproveAction = async (actionId: string, decision: 'APPROVE' | 'REJECT') => {
    await approveEmergencyAction(actionId, decision);
  };

  const getStatusColor = (status: WalletFreezeStatus | null) => {
    if (!status) return 'text-green-600';
    return status.isFrozen ? 'text-red-600' : 'text-green-600';
  };

  const getStatusIcon = (status: WalletFreezeStatus | null) => {
    if (!status) return <Unlock className="w-5 h-5 text-green-600" />;
    return status.isFrozen ? <Lock className="w-5 h-5 text-red-600" /> : <Unlock className="w-5 h-5 text-green-600" />;
  };

  if (loading && !freezeStatus) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Emergency Controls</h2>
          </div>
          <button
            onClick={refreshData}
            className="px-3 py-1 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'status', label: 'Status', icon: Shield },
            { id: 'contacts', label: 'Contacts', icon: Users },
            { id: 'actions', label: 'Actions', icon: Settings },
            { id: 'overrides', label: 'Overrides', icon: AlertTriangle }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'status' && (
          <div className="space-y-6">
            {/* Wallet Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(freezeStatus)}
                  <div>
                    <h3 className="font-medium text-gray-900">Wallet Status</h3>
                    <p className={`text-sm ${getStatusColor(freezeStatus)}`}>
                      {freezeStatus?.isFrozen ? 'Frozen' : 'Active'}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {freezeStatus?.isFrozen ? (
                    <button
                      onClick={handleUnfreezeWallet}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                    >
                      Unfreeze
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowFreezeModal(true)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      Freeze Wallet
                    </button>
                  )}
                </div>
              </div>
              
              {freezeStatus?.isFrozen && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {freezeStatus.freezeReason}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Frozen at:</strong> {new Date(freezeStatus.frozenAt!).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Type:</strong> {freezeStatus.freezeType}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-blue-600">Emergency Contacts</p>
                    <p className="text-lg font-semibold text-blue-900">{emergencyContacts.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm text-yellow-600">Pending Actions</p>
                    <p className="text-lg font-semibold text-yellow-900">{pendingActions.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm text-purple-600">Active Overrides</p>
                    <p className="text-lg font-semibold text-purple-900">{activeOverrides.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contacts</h3>
              <button
                onClick={() => setShowAddContact(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>
            
            {emergencyContacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No emergency contacts configured</p>
                <p className="text-sm">Add trusted contacts who can help in emergencies</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emergencyContacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{contact.name}</h4>
                        <p className="text-sm text-gray-600">{contact.contactType}</p>
                        <p className="text-sm text-gray-500">Priority: {contact.priority}</p>
                        <div className="flex space-x-4 mt-2">
                          {contact.canUnfreeze && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Can Unfreeze
                            </span>
                          )}
                          {contact.canOverride && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Can Override
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveContact(contact.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Pending Actions</h3>
            
            {pendingActions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No pending emergency actions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{action.actionType}</h4>
                        <p className="text-sm text-gray-600">{action.reason}</p>
                        <p className="text-sm text-gray-500">
                          Initiated: {new Date(action.timestamp).toLocaleString()}
                        </p>
                        <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                          action.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          action.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {action.status}
                        </span>
                      </div>
                      
                      {action.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveAction(action.id, 'APPROVE')}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleApproveAction(action.id, 'REJECT')}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overrides' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Active Overrides</h3>
            
            {activeOverrides.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No active administrative overrides</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOverrides.map((override) => (
                  <div key={override.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{override.overrideType}</h4>
                        <p className="text-sm text-gray-600">{override.reason}</p>
                        <p className="text-sm text-gray-500">
                          Expires: {new Date(override.expiresAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => revokeAdminOverride(override.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddContactModal
        isOpen={showAddContact}
        onClose={() => setShowAddContact(false)}
        onAdd={handleAddContact}
      />

      {/* Freeze Wallet Modal */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Freeze Wallet</h3>
              <button onClick={() => setShowFreezeModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for freezing
                </label>
                <textarea
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Explain why you're freezing this wallet..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowFreezeModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezeWallet}
                  disabled={!freezeReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Freeze Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyControlsDashboard;