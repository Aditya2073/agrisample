import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Produce } from '../types';
import { Plus, Package, Truck, Settings, AlertCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';

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

  const handleOrderStatus = async (orderId: string, status: 'accepted' | 'declined' | 'completed') => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*, produce(*)')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      // Start a transaction for completed orders
      if (status === 'completed') {
        const newQuantity = orderData.produce.quantity - orderData.quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient produce quantity');
        }

        // Update produce quantity and order status atomically
        const { error: updateError } = await supabase.rpc('update_order_and_produce', {
          p_order_id: orderId,
          p_produce_id: orderData.produce_id,
          p_new_quantity: newQuantity,
          p_new_status: status
        });

        if (updateError) throw updateError;
      } else {
        // For non-completed statuses, just update the order
        const { error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);

        if (error) throw error;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header
          title={`Welcome, ${user?.name}`}
          subtitle="Manage your produce and orders"
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-8">
          {/* Quick Stats */}
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
              element={
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Produce Listings</h2>
                  {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center shadow-sm">
                      <AlertCircle className="h-5 w-5 mr-3" />
                      {error}
                    </div>
                  )}
                  <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Quantity
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Price
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {produces.map((produce) => (
                            <tr key={produce.id} className="hover:bg-gray-50 transition-colors duration-200">
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {produce.name}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  {produce.description}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 font-medium">
                                  {produce.quantity} {produce.unit}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 font-medium">
                                  ₹{produce.price}/{produce.unit}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${produce.status === 'available'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                                  }`}>
                                  {produce.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              }
            />
            <Route
              path="orders"
              element={
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Incoming Orders</h2>
                  <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Buyer Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Price
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {(order.produce as Produce).name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Order #{order.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {(order.buyer as any)?.name || 'Unknown Buyer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(order.buyer as any)?.phone || 'No phone number'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.quantity} {(order.produce as Produce).unit}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{order.total_price}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : order.status === 'accepted' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleOrderStatus(order.id, 'accepted')}
                            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleOrderStatus(order.id, 'declined')}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleOrderStatus(order.id, 'completed')}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          Mark as Completed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
              }
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
      </div>
    </div>
  );
};