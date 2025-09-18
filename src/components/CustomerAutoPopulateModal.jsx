import React, { useState } from 'react';
import { X, Search, User, Building, Phone, Mail, MapPin } from 'lucide-react';

const CustomerAutoPopulateModal = ({ isOpen, onClose, onCustomerSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers] = useState([
    {
      id: 1,
      name: 'Acme Corporation',
      contactName: 'John Smith',
      phone: '(555) 123-4567',
      email: 'john@acme.com',
      address: '123 Business Ave, City, ST 12345',
      lastProject: '2024-08-15',
      totalProjects: 12
    },
    {
      id: 2,
      name: 'TechStart Inc',
      contactName: 'Sarah Johnson',
      phone: '(555) 987-6543',
      email: 'sarah@techstart.com',
      address: '456 Innovation Blvd, City, ST 12345',
      lastProject: '2024-08-20',
      totalProjects: 8
    },
    {
      id: 3,
      name: 'Green Solutions Ltd',
      contactName: 'Mike Davis',
      phone: '(555) 456-7890',
      email: 'mike@greensolutions.com',
      address: '789 Eco Park, City, ST 12345',
      lastProject: '2024-08-10',
      totalProjects: 15
    }
  ]);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer) => {
    onCustomerSelect && onCustomerSelect(customer);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Select Customer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="overflow-y-auto max-h-96">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No customers found matching your search.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {customer.name}
                          </h3>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span>{customer.contactName}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{customer.phone}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span>{customer.email}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{customer.address}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-500 mb-1">
                        Last Project: {new Date(customer.lastProject).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {customer.totalProjects} projects
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={() => {
                  // Handle new customer creation
                  console.log('Create new customer');
                  onClose();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAutoPopulateModal;