import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Produce } from '../types';
import { Plus, Package, Truck, Settings, AlertCircle, MessageSquare } from 'lucide-react';
import { Header } from '../components/Header';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { ProduceListings } from '../components/ProduceListings';
import { IncomingOrders } from '../components/IncomingOrders';
import { AIChat } from '../components/AIChat';

export const FarmerDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [produces, setProduces] = useState<Produce[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddingProduce, setIsAddingProduce] = useState(false);
  const [newProduce, setNewProduce] = useState({
    name: '',
    description: '',
    quantity: 0,
    unit: 'kg',
    price: 0,
  });
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    loadProduces();
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, produce(*), buyer:profiles!orders_buyer_id_fkey(*)')
        .eq('produce.farmer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const handleOrderStatus = async (orderId: string, newStatus: 'completed' | 'cancelled' | 'shipped' | 'delivered') => {
    setLoading(true);
    setError('');
    
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, produce(*)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      // For completed orders, we need to update the produce quantity
      if (newStatus === 'completed') {
        const newQuantity = orderData.produce.quantity - orderData.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient produce quantity');
        }

        // Update produce quantity and status
        const { error: produceError } = await supabase
          .from('produce')
          .update({ 
            quantity: newQuantity,
            status: newQuantity === 0 ? 'sold' : 'available'
          })
          .eq('id', orderData.produce_id);

        if (produceError) throw produceError;
      }

      // Update order status
      const { error: statusError } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (statusError) {
        console.error('Error updating order status:', statusError);
        throw new Error('Could not update order status. The order may have already been processed.');
      }

      await Promise.all([loadOrders(), loadProduces()]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
      console.error('Error updating order status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProduces = async () => {
    try {
      const { data, error } = await supabase
        .from('produce')
        .select('*')
        .eq('farmer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProduces(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load produces');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('produce').insert([
        {
          farmer_id: user?.id,
          ...newProduce,
          status: 'available',
        },
      ]);

      if (error) throw error;
      
      setIsAddingProduce(false);
      setNewProduce({
        name: '',
        description: '',
        quantity: 0,
        unit: 'kg',
        price: 0,
      });
      await loadProduces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add produce');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAction = async (action: string, data: any) => {
    switch (action) {
      case 'ADD_PRODUCE':
        try {
          // Format the data
          const produceData = {
            name: data.name,
            description: data.description,
            quantity: parseFloat(data.quantity),
            unit: data.unit || 'kg',
            price: parseFloat(data.price),
            farmer_id: user?.id,
            status: 'available',
            created_at: new Date().toISOString()
          };

          // Insert into Supabase
          const { error } = await supabase
            .from('produce')
            .insert([produceData]);

          if (error) {
            console.error('Supabase error:', error);
            throw new Error('Failed to add produce');
          }
          
          // Immediately refresh the produce list
          await loadProduces();
          return true;
        } catch (error) {
          console.error('Error adding produce:', error);
          throw error; // Propagate error to AIChat for proper error handling
        }
      case 'UPDATE_ORDER':
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status: data.status })
            .eq('id', data.id);

          if (error) {
            console.error('Supabase error:', error);
            throw new Error('Failed to update order');
          }

          // Refresh orders list
          await loadOrders();
          return true;
        } catch (error) {
          console.error('Error updating order:', error);
          throw error;
        }
      case 'UPDATE_PRODUCE':
        try {
          const { error } = await supabase
            .from('produce')
            .update(data.updates)
            .eq('id', data.id);
          
          if (error) throw error;
          await loadProduces();
        } catch (error) {
          console.error('Error updating produce:', error);
        }
        break;

      default:
        console.log('Unknown action:', action);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <Header
            title={`Welcome, ${user?.name}`}
            subtitle="Manage your produce and orders"
          />
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-all duration-200 ease-in-out"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            AI Assistant
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-4">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Listings
                </h2>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {produces.filter((p) => p.status === 'available').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Total Sales
                </h2>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {orders.filter((o) => o.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  ₹{orders.filter((o) => o.status === 'completed').reduce((sum, order) => sum + order.total_price, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Settings className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Account Status
                </h2>
                <p className="text-lg font-medium text-purple-600 mt-1">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Produce Button */}
        <div className="mt-12">
          <button
            onClick={() => setIsAddingProduce(true)}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-300"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Produce
          </button>
        </div>

        <div style={{zIndex:0}} className="sticky top-0 z-10 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pt-4 pb-4">
          <nav className="bg-white shadow-lg rounded-lg p-4 mb-8">
            <ul className="flex space-x-8">
              <li>
                <NavLink
                  to="/farmer/listings"
                  className={({ isActive }) =>
                    `text-lg font-medium transition-colors duration-200 ${isActive
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-green-600'
                    }`
                  }
                >
                  Your Produce Listings
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/farmer/orders"
                  className={({ isActive }) =>
                    `text-lg font-medium transition-colors duration-200 ${isActive
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-green-600'
                    }`
                  }
                >
                  Incoming Orders
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-4">
          <Routes>
            <Route path="/" element={<Navigate to="listings" replace />} />
            <Route
              path="listings"
              element={<ProduceListings produces={produces} error={error} />}
            />
            <Route
              path="orders"
              element={<IncomingOrders orders={orders} onOrderStatusChange={handleOrderStatus} />}
            />
          </Routes>
        </div>

        {/* Add Produce Modal */}
        {isAddingProduce && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
            <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-300">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Produce</h2>
              <form onSubmit={handleAddProduce} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduce.name}
                    onChange={(e) =>
                      setNewProduce({ ...newProduce, name: e.target.value })
                    }
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    required
                    value={newProduce.description}
                    onChange={(e) =>
                      setNewProduce({
                        ...newProduce,
                        description: e.target.value,
                      })
                    }
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newProduce.quantity}
                      onChange={(e) =>
                        setNewProduce({
                          ...newProduce,
                          quantity: Number(e.target.value),
                        })
                      }
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      value={newProduce.unit}
                      onChange={(e) =>
                        setNewProduce({ ...newProduce, unit: e.target.value })
                      }
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                      <option value="ton">Ton</option>
                      <option value="piece">Piece</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newProduce.price}
                    onChange={(e) =>
                      setNewProduce({
                        ...newProduce,
                        price: Number(e.target.value),
                      })
                    }
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                  />
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setIsAddingProduce(false)}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading ? 'Adding...' : 'Add Produce'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showAIChat && (
          <div className="absolute bottom-16 right-0 w-[450px] mb-2">
            <AIChat onAction={handleAIAction} />
          </div>
        )}
      </div>
    </div>
  );
};