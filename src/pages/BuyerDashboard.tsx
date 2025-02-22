import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ShoppingBag, Package, CreditCard } from 'lucide-react';
import { Header } from '../components/Header';
import { NavigationBar } from '../components/NavigationBar';
import { AvailableProducts } from '../components/AvailableProducts';
import { OrderHistory } from '../components/OrderHistory';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

export const BuyerDashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user?.id);

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingOrders = orders.filter(order => order.status === 'pending').length;
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + order.total_price, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <NavigationBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header
          title={`Welcome, ${user?.name}`}
          subtitle="Browse and purchase fresh produce"
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-8">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-50">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Pending Orders</h3>
                <p className="text-2xl font-semibold text-gray-700">{pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-50">
                <Package className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Orders</h3>
                <p className="text-2xl font-semibold text-gray-700">{totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-50">
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Total Spent</h3>
                <p className="text-2xl font-semibold text-gray-700">₹{totalSpent}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8">
          <nav className="bg-white shadow-lg rounded-lg p-4">
            <Routes>
              <Route path="/" element={<Navigate to="products" replace />} />
              <Route path="products" element={<AvailableProducts />} />
              <Route path="orders" element={<OrderHistory orders={orders} />} />
            </Routes>
          </nav>
        </div>
      </div>
    </div>
  );
};