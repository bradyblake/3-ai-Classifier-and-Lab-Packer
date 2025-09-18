import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Truck,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Route,
  Calendar,
  Fuel,
  Shield,
  Navigation,
  Package,
  FileText,
  Users,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';
import BackButton from './BackButton';

const WasteRouting = () => {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [optimization, setOptimization] = useState('efficiency');
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeStats, setRouteStats] = useState({
    totalDistance: 0,
    estimatedTime: 0,
    fuelCost: 0,
    co2Emissions: 0,
    routeEfficiency: 0
  });

  // Mock data for demonstration
  const mockRoutes = [
    {
      id: 'route_1',
      name: 'Houston Metro Route A',
      status: 'active',
      driver: 'Mike Johnson',
      vehicle: 'Truck-001 (Class 8)',
      stops: [
        {
          id: 'stop_1',
          companyName: 'MedTech Solutions',
          address: '5678 Medical Center Dr, Houston, TX 77030',
          wasteType: 'Medical Waste',
          quantity: '50 lbs',
          scheduledTime: '09:00 AM',
          estimatedDuration: '30 min',
          specialRequirements: ['Temperature Control', 'Chain of Custody'],
          status: 'completed',
          coordinates: { lat: 29.7372, lng: -95.3960 }
        },
        {
          id: 'stop_2',
          companyName: 'Advanced Materials Research',
          address: '1234 Research Blvd, Austin, TX 78701',
          wasteType: 'Lab Chemicals',
          quantity: '25 containers',
          scheduledTime: '11:30 AM',
          estimatedDuration: '45 min',
          specialRequirements: ['Hazmat Certified', 'DOT Placards'],
          status: 'en_route',
          coordinates: { lat: 30.2672, lng: -97.7431 }
        },
        {
          id: 'stop_3',
          companyName: 'Petrochemical Industries',
          address: '9012 Industrial Way, Beaumont, TX 77701',
          wasteType: 'Industrial Waste',
          quantity: '500 gallons',
          scheduledTime: '02:00 PM',
          estimatedDuration: '60 min',
          specialRequirements: ['Pump Equipment', 'Manifests Required'],
          status: 'pending',
          coordinates: { lat: 30.0860, lng: -94.1018 }
        }
      ],
      totalDistance: 287,
      estimatedTime: '6.5 hours',
      fuelCost: 89.50,
      efficiency: 92,
      created: '2025-09-11T07:00:00Z',
      optimizationCriteria: 'time_distance'
    },
    {
      id: 'route_2',
      name: 'Dallas-Fort Worth Circuit',
      status: 'scheduled',
      driver: 'Sarah Chen',
      vehicle: 'Truck-002 (Class 6)',
      stops: [
        {
          id: 'stop_4',
          companyName: 'Dallas Tech Center',
          address: '1500 Tech Blvd, Dallas, TX 75201',
          wasteType: 'Electronic Waste',
          quantity: '200 lbs',
          scheduledTime: '08:30 AM',
          estimatedDuration: '30 min',
          specialRequirements: ['Asset Tracking', 'Data Destruction'],
          status: 'scheduled',
          coordinates: { lat: 32.7767, lng: -96.7970 }
        },
        {
          id: 'stop_5',
          companyName: 'Manufacturing Solutions Inc',
          address: '2800 Industrial Dr, Fort Worth, TX 76102',
          wasteType: 'Industrial Waste',
          quantity: '750 lbs',
          scheduledTime: '10:45 AM',
          estimatedDuration: '50 min',
          specialRequirements: ['Heavy Lifting Equipment'],
          status: 'scheduled',
          coordinates: { lat: 32.7555, lng: -97.3308 }
        }
      ],
      totalDistance: 156,
      estimatedTime: '4.2 hours',
      fuelCost: 52.30,
      efficiency: 88,
      created: '2025-09-11T06:30:00Z',
      optimizationCriteria: 'cost_efficiency'
    }
  ];

  const mockVehicles = [
    { id: 'truck_001', name: 'Truck-001', type: 'Class 8', capacity: '1000 lbs', status: 'active', fuelType: 'Diesel' },
    { id: 'truck_002', name: 'Truck-002', type: 'Class 6', capacity: '750 lbs', status: 'active', fuelType: 'Diesel' },
    { id: 'van_001', name: 'Van-001', type: 'Sprinter', capacity: '500 lbs', status: 'maintenance', fuelType: 'Gas' }
  ];

  useEffect(() => {
    loadRoutes();
    setVehicleTypes(mockVehicles);
  }, []);

  const loadRoutes = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setRoutes(mockRoutes);
      calculateRouteStats(mockRoutes);
      setLoading(false);
    }, 1000);
  };

  const calculateRouteStats = (routeData) => {
    const stats = routeData.reduce((acc, route) => ({
      totalDistance: acc.totalDistance + route.totalDistance,
      estimatedTime: acc.estimatedTime + parseFloat(route.estimatedTime),
      fuelCost: acc.fuelCost + route.fuelCost,
      co2Emissions: acc.co2Emissions + (route.totalDistance * 0.89), // kg CO2 per mile
      routeEfficiency: acc.routeEfficiency + route.efficiency
    }), { totalDistance: 0, estimatedTime: 0, fuelCost: 0, co2Emissions: 0, routeEfficiency: 0 });

    stats.routeEfficiency = routeData.length > 0 ? stats.routeEfficiency / routeData.length : 0;
    setRouteStats(stats);
  };

  const optimizeRoutes = async (criteria) => {
    setLoading(true);
    setOptimization(criteria);
    
    // Simulate route optimization API call
    setTimeout(() => {
      console.log(`🚛 Optimizing routes for ${criteria}`);
      // In real implementation, this would call optimization service
      const optimizedRoutes = mockRoutes.map(route => ({
        ...route,
        efficiency: Math.min(route.efficiency + Math.random() * 10, 100),
        optimizationCriteria: criteria
      }));
      
      setRoutes(optimizedRoutes);
      calculateRouteStats(optimizedRoutes);
      setLoading(false);
    }, 2000);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'en_route': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateManifest = (route) => {
    console.log('📋 Generating manifest for route:', route.name);
    // In real implementation, this would generate and download manifests
    alert(`Manifest generation for ${route.name} initiated. Documents will be available in the driver portal.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <BackButton />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <Route className="mr-3 text-green-600" size={32} />
          🚛 Waste Routing & Logistics
        </h1>
        <p className="text-gray-600">
          Optimize waste collection routes, manage vehicle dispatch, and ensure regulatory compliance for efficient operations.
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Distance</p>
              <p className="text-2xl font-bold text-blue-600">{routeStats.totalDistance}</p>
              <p className="text-xs text-gray-500">miles today</p>
            </div>
            <Navigation className="text-blue-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Estimated Time</p>
              <p className="text-2xl font-bold text-purple-600">{routeStats.estimatedTime.toFixed(1)}</p>
              <p className="text-xs text-gray-500">hours total</p>
            </div>
            <Clock className="text-purple-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Fuel Cost</p>
              <p className="text-2xl font-bold text-green-600">${routeStats.fuelCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">estimated</p>
            </div>
            <Fuel className="text-green-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CO₂ Emissions</p>
              <p className="text-2xl font-bold text-orange-600">{routeStats.co2Emissions.toFixed(1)}</p>
              <p className="text-xs text-gray-500">kg estimated</p>
            </div>
            <AlertTriangle className="text-orange-600" size={24} />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Efficiency</p>
              <p className="text-2xl font-bold text-indigo-600">{routeStats.routeEfficiency.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">optimization</p>
            </div>
            <BarChart3 className="text-indigo-600" size={24} />
          </div>
        </div>
      </div>

      {/* Route Optimization Controls */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Settings className="mr-2" size={20} />
            Route Optimization
          </h2>
          <button
            onClick={loadRoutes}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} size={16} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => optimizeRoutes('time_distance')}
            disabled={loading}
            className={`p-4 border rounded-lg transition-colors ${
              optimization === 'time_distance'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Clock className="mb-2" size={20} />
            <p className="font-medium">Time & Distance</p>
            <p className="text-sm text-gray-600">Minimize travel time and distance</p>
          </button>

          <button
            onClick={() => optimizeRoutes('cost_efficiency')}
            disabled={loading}
            className={`p-4 border rounded-lg transition-colors ${
              optimization === 'cost_efficiency'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <DollarSign className="mb-2" size={20} />
            <p className="font-medium">Cost Efficiency</p>
            <p className="text-sm text-gray-600">Optimize for fuel and operational costs</p>
          </button>

          <button
            onClick={() => optimizeRoutes('environmental')}
            disabled={loading}
            className={`p-4 border rounded-lg transition-colors ${
              optimization === 'environmental'
                ? 'border-green-600 bg-green-50 text-green-800'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <AlertTriangle className="mb-2" size={20} />
            <p className="font-medium">Environmental</p>
            <p className="text-sm text-gray-600">Reduce carbon footprint</p>
          </button>

          <button
            onClick={() => optimizeRoutes('safety_compliance')}
            disabled={loading}
            className={`p-4 border rounded-lg transition-colors ${
              optimization === 'safety_compliance'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Shield className="mb-2" size={20} />
            <p className="font-medium">Safety & Compliance</p>
            <p className="text-sm text-gray-600">Prioritize safety and regulatory compliance</p>
          </button>
        </div>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
              <RefreshCw className="animate-spin mr-2" size={16} />
              Optimizing routes...
            </div>
          </div>
        )}
      </div>

      {/* Active Routes */}
      <div className="space-y-6">
        {routes.map((route) => (
          <div key={route.id} className="bg-white rounded-lg border shadow-sm">
            {/* Route Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <Truck className="mr-2 text-blue-600" size={20} />
                    {route.name}
                  </h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>👤 {route.driver}</span>
                    <span>🚛 {route.vehicle}</span>
                    <span className={`px-2 py-1 rounded ${getStatusColor(route.status)}`}>
                      {route.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{route.efficiency}%</div>
                  <div className="text-sm text-gray-500">efficiency</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-lg font-semibold text-gray-800">{route.totalDistance} mi</div>
                  <div className="text-sm text-gray-600">Total Distance</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-lg font-semibold text-gray-800">{route.estimatedTime}</div>
                  <div className="text-sm text-gray-600">Est. Time</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-lg font-semibold text-gray-800">${route.fuelCost}</div>
                  <div className="text-sm text-gray-600">Fuel Cost</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-lg font-semibold text-gray-800">{route.stops.length}</div>
                  <div className="text-sm text-gray-600">Stops</div>
                </div>
              </div>

              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => setSelectedRoute(selectedRoute?.id === route.id ? null : route)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <MapPin className="mr-1" size={16} />
                  {selectedRoute?.id === route.id ? 'Hide Details' : 'View Route'}
                </button>
                <button
                  onClick={() => generateManifest(route)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <FileText className="mr-1" size={16} />
                  Generate Manifest
                </button>
              </div>
            </div>

            {/* Route Details */}
            {selectedRoute?.id === route.id && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Route Stops</h4>
                <div className="space-y-4">
                  {route.stops.map((stop, index) => (
                    <div key={stop.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                              stop.status === 'completed' ? 'bg-green-500' :
                              stop.status === 'en_route' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h5 className="font-semibold text-gray-800">{stop.companyName}</h5>
                              <p className="text-sm text-gray-600">{stop.address}</p>
                            </div>
                          </div>

                          <div className="ml-11 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Waste Type:</span>
                              <div className="font-medium">{stop.wasteType}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Quantity:</span>
                              <div className="font-medium">{stop.quantity}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Scheduled:</span>
                              <div className="font-medium">{stop.scheduledTime}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Duration:</span>
                              <div className="font-medium">{stop.estimatedDuration}</div>
                            </div>
                          </div>

                          {stop.specialRequirements.length > 0 && (
                            <div className="ml-11 mt-3">
                              <span className="text-sm text-gray-600">Special Requirements:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {stop.specialRequirements.map((req, i) => (
                                  <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                    {req}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(stop.status)}`}>
                            {stop.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {routes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Truck className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Active Routes</h3>
          <p className="text-gray-500">
            Routes will appear here when scheduled or in progress.
          </p>
        </div>
      )}
    </div>
  );
};

export default WasteRouting;