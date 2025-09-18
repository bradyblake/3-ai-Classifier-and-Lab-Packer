// File: src/components/QuoteGenerator.jsx
import React, { useEffect, useState } from "react";
import { injectConfig } from "../ai/securityUtils.js";
import BackButton from "./BackButton";
import { 
  FileText, 
  DollarSign, 
  Plus, 
  Trash2, 
  Calculator, 
  Send, 
  Download,
  Users,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  RefreshCw
} from "lucide-react";

export default function QuoteGenerator() {
  const [toolColors, setToolColors] = useState({});
  const [activeTab, setActiveTab] = useState("create");
  const [quoteData, setQuoteData] = useState({
    quoteNumber: `Q-${Date.now()}`,
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    services: [],
    notes: "",
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discount: 0,
    tax: 8.5
  });
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalQuotes: 0,
    totalValue: 0,
    conversionRate: 0,
    avgQuoteValue: 0,
    monthlyTrends: []
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const serviceCategories = [
    {
      id: "waste-pickup",
      name: "Waste Pickup & Collection",
      basePrice: 150,
      unit: "pickup",
      factors: ["volume", "frequency", "distance", "hazmat"]
    },
    {
      id: "lab-pack",
      name: "Lab Pack Services",
      basePrice: 350,
      unit: "container",
      factors: ["size", "complexity", "hazmat", "urgency"]
    },
    {
      id: "disposal",
      name: "Waste Disposal",
      basePrice: 2.50,
      unit: "lb",
      factors: ["waste-type", "treatment", "regulatory", "volume"]
    },
    {
      id: "transportation",
      name: "Transportation",
      basePrice: 3.25,
      unit: "mile",
      factors: ["distance", "vehicle-type", "hazmat", "urgency"]
    },
    {
      id: "consulting",
      name: "Environmental Consulting",
      basePrice: 125,
      unit: "hour",
      factors: ["expertise", "complexity", "duration", "travel"]
    },
    {
      id: "training",
      name: "Safety Training",
      basePrice: 85,
      unit: "person",
      factors: ["duration", "certification", "location", "materials"]
    }
  ];

  const pricingFactors = {
    volume: { small: 1.0, medium: 1.2, large: 1.5, bulk: 2.0 },
    frequency: { oneTime: 1.0, weekly: 0.9, monthly: 0.85, annual: 0.8 },
    distance: { local: 1.0, regional: 1.3, statewide: 1.6, national: 2.2 },
    hazmat: { none: 1.0, low: 1.4, medium: 1.8, high: 2.5 },
    urgency: { standard: 1.0, expedited: 1.5, emergency: 2.0 },
    complexity: { simple: 1.0, moderate: 1.3, complex: 1.7, specialized: 2.2 }
  };

  const quoteTemplates = [
    {
      id: "standard-pickup",
      name: "Standard Waste Pickup",
      services: [
        { category: "waste-pickup", quantity: 1, factors: { volume: "medium", frequency: "monthly" } }
      ]
    },
    {
      id: "lab-pack-full",
      name: "Complete Lab Pack Service",
      services: [
        { category: "lab-pack", quantity: 5, factors: { size: "medium", complexity: "moderate" } },
        { category: "transportation", quantity: 25, factors: { distance: "regional" } }
      ]
    },
    {
      id: "consulting-package",
      name: "Environmental Consulting Package",
      services: [
        { category: "consulting", quantity: 8, factors: { expertise: "high", complexity: "complex" } },
        { category: "training", quantity: 12, factors: { certification: true } }
      ]
    }
  ];

  useEffect(() => {
    setToolColors(JSON.parse(localStorage.getItem("toolColors")) || {});
    loadSavedData();
    generateMockAnalytics();
  }, []);

  const loadSavedData = () => {
    const saved = localStorage.getItem("quoteGenerator");
    if (saved) {
      const data = JSON.parse(saved);
      setSavedQuotes(data.quotes || []);
      setTemplates(data.templates || quoteTemplates);
    } else {
      setTemplates(quoteTemplates);
    }
  };

  const saveData = () => {
    const dataToSave = {
      quotes: savedQuotes,
      templates: templates
    };
    localStorage.setItem("quoteGenerator", JSON.stringify(dataToSave));
  };

  const generateMockAnalytics = () => {
    const mockQuotes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      value: Math.random() * 5000 + 500,
      status: Math.random() > 0.7 ? 'accepted' : Math.random() > 0.5 ? 'pending' : 'declined',
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    }));

    const totalValue = mockQuotes.reduce((sum, q) => sum + q.value, 0);
    const accepted = mockQuotes.filter(q => q.status === 'accepted');
    
    setAnalytics({
      totalQuotes: mockQuotes.length,
      totalValue: totalValue,
      conversionRate: (accepted.length / mockQuotes.length) * 100,
      avgQuoteValue: totalValue / mockQuotes.length,
      monthlyTrends: generateMonthlyTrends(mockQuotes)
    });
  };

  const generateMonthlyTrends = (quotes) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => ({
      month,
      quotes: Math.floor(Math.random() * 15) + 5,
      value: Math.floor(Math.random() * 25000) + 10000
    }));
  };

  const addService = () => {
    setQuoteData(prev => ({
      ...prev,
      services: [...prev.services, {
        id: Date.now(),
        category: "waste-pickup",
        quantity: 1,
        factors: {},
        customPrice: null
      }]
    }));
  };

  const updateService = (serviceId, field, value) => {
    setQuoteData(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === serviceId 
          ? { ...service, [field]: value }
          : service
      )
    }));
  };

  const removeService = (serviceId) => {
    setQuoteData(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== serviceId)
    }));
  };

  const calculateServicePrice = (service) => {
    if (service.customPrice) return service.customPrice * service.quantity;
    
    const category = serviceCategories.find(cat => cat.id === service.category);
    if (!category) return 0;

    let price = category.basePrice;
    
    Object.entries(service.factors).forEach(([factor, value]) => {
      if (pricingFactors[factor] && pricingFactors[factor][value]) {
        price *= pricingFactors[factor][value];
      }
    });

    return price * service.quantity;
  };

  const calculateTotalPrice = () => {
    const subtotal = quoteData.services.reduce((total, service) => 
      total + calculateServicePrice(service), 0
    );
    const discountAmount = subtotal * (quoteData.discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (quoteData.tax / 100);
    
    return {
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total: taxableAmount + taxAmount
    };
  };

  const saveQuote = () => {
    const newQuote = {
      ...quoteData,
      id: Date.now(),
      createdAt: new Date(),
      status: 'draft',
      pricing: calculateTotalPrice()
    };
    
    setSavedQuotes(prev => [...prev, newQuote]);
    setTimeout(saveData, 100);
    
    setQuoteData({
      quoteNumber: `Q-${Date.now()}`,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      services: [],
      notes: "",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      discount: 0,
      tax: 8.5
    });
  };

  const loadTemplate = (template) => {
    setQuoteData(prev => ({
      ...prev,
      services: template.services.map(service => ({
        ...service,
        id: Date.now() + Math.random()
      }))
    }));
  };

  const exportToPDF = () => {
    console.log("Exporting quote to PDF:", quoteData);
  };

  const sendQuote = () => {
    console.log("Sending quote via email:", quoteData);
  };

  const filteredQuotes = savedQuotes.filter(quote => {
    const matchesSearch = quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || quote.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const bgColor = toolColors["QuoteGenerator"] || "#1e1e1e";
  const pricing = calculateTotalPrice();

  const renderCreateTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Client Information
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Client Name"
              value={quoteData.clientName}
              onChange={(e) => setQuoteData(prev => ({ ...prev, clientName: e.target.value }))}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
            />
            <input
              type="email"
              placeholder="Email"
              value={quoteData.clientEmail}
              onChange={(e) => setQuoteData(prev => ({ ...prev, clientEmail: e.target.value }))}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={quoteData.clientPhone}
              onChange={(e) => setQuoteData(prev => ({ ...prev, clientPhone: e.target.value }))}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600"
            />
            <textarea
              placeholder="Address"
              value={quoteData.clientAddress}
              onChange={(e) => setQuoteData(prev => ({ ...prev, clientAddress: e.target.value }))}
              className="w-full p-2 bg-gray-700 rounded border border-gray-600 h-20"
            />
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Quote Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Quote Number</label>
              <input
                type="text"
                value={quoteData.quoteNumber}
                onChange={(e) => setQuoteData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Valid Until</label>
              <input
                type="date"
                value={quoteData.validUntil}
                onChange={(e) => setQuoteData(prev => ({ ...prev, validUntil: e.target.value }))}
                className="w-full p-2 bg-gray-700 rounded border border-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Discount (%)</label>
                <input
                  type="number"
                  value={quoteData.discount}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tax (%)</label>
                <input
                  type="number"
                  value={quoteData.tax}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Services</h3>
          <button
            onClick={addService}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>

        <div className="space-y-4">
          {quoteData.services.map((service, index) => (
            <div key={service.id} className="bg-gray-700 p-4 rounded border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Service</label>
                  <select
                    value={service.category}
                    onChange={(e) => updateService(service.id, 'category', e.target.value)}
                    className="w-full p-2 bg-gray-600 rounded border border-gray-500"
                  >
                    {serviceCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={service.quantity}
                    onChange={(e) => updateService(service.id, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-gray-600 rounded border border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Price</label>
                  <div className="text-lg font-semibold text-green-400">
                    ${calculateServicePrice(service).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => removeService(service.id)}
                  className="bg-red-600 hover:bg-red-700 p-2 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Templates</h3>
          <div className="space-y-2">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template)}
                className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Quote Summary
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${pricing.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-400">
              <span>Discount:</span>
              <span>-${pricing.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${pricing.tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-xl font-bold text-green-400">
              <span>Total:</span>
              <span>${pricing.total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mt-6 space-y-2">
            <button
              onClick={saveQuote}
              className="w-full bg-green-600 hover:bg-green-700 py-2 rounded flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Save Quote
            </button>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={sendQuote}
                className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <textarea
          value={quoteData.notes}
          onChange={(e) => setQuoteData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes or terms..."
          className="w-full p-3 bg-gray-700 rounded border border-gray-600 h-24"
        />
      </div>
    </div>
  );

  const renderQuotesTab = () => (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 p-2 bg-gray-700 rounded border border-gray-600"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 bg-gray-700 rounded border border-gray-600"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      <div className="grid gap-4">
        {filteredQuotes.map(quote => (
          <div key={quote.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{quote.quoteNumber}</h4>
                <p className="text-gray-400">{quote.clientName}</p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(quote.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-400">
                  ${quote.pricing.total.toFixed(2)}
                </div>
                <div className={`text-sm px-2 py-1 rounded ${
                  quote.status === 'accepted' ? 'bg-green-600' :
                  quote.status === 'sent' ? 'bg-blue-600' :
                  quote.status === 'declined' ? 'bg-red-600' : 'bg-gray-600'
                }`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-400">{analytics.totalQuotes}</div>
          <div className="text-gray-400">Total Quotes</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-400">
            ${analytics.totalValue.toLocaleString()}
          </div>
          <div className="text-gray-400">Total Value</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-400">
            {analytics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-gray-400">Conversion Rate</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-400">
            ${analytics.avgQuoteValue.toFixed(0)}
          </div>
          <div className="text-gray-400">Avg Quote Value</div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Monthly Trends
        </h3>
        <div className="grid grid-cols-6 gap-4">
          {analytics.monthlyTrends.map((month, index) => (
            <div key={index} className="text-center">
              <div className="bg-gray-700 h-24 rounded mb-2 flex items-end justify-center">
                <div
                  className="bg-blue-500 w-8 rounded-t"
                  style={{ height: `${(month.value / 25000) * 80}px` }}
                />
              </div>
              <div className="text-sm">{month.month}</div>
              <div className="text-xs text-gray-400">${(month.value / 1000).toFixed(0)}k</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <BackButton />
      <div style={{ backgroundColor: bgColor, color: "#fff", height: "100%", padding: 20 }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <DollarSign className="w-8 h-8" />
            Professional Quote Generator
          </h2>
          <button
            onClick={generateMockAnalytics}
            className="bg-gray-700 hover:bg-gray-600 p-2 rounded"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              activeTab === "create" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Create Quote
          </button>
          <button
            onClick={() => setActiveTab("quotes")}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              activeTab === "quotes" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Manage Quotes ({savedQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-t-lg font-medium ${
              activeTab === "analytics" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Analytics
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          {activeTab === "create" && renderCreateTab()}
          {activeTab === "quotes" && renderQuotesTab()}
          {activeTab === "analytics" && renderAnalyticsTab()}
        </div>
      </div>
    </>
  );
}
