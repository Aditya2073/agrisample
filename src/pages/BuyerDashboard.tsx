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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header
          title={`Welcome, ${user?.name}`}
          subtitle="Browse and purchase fresh produce"
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingBag className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Total Orders</h2>
                <p className="text-3xl font-bold text-blue-600 mt-1">{totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Package className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pending Orders</h2>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Total Spent</h2>
                <p className="text-3xl font-bold text-purple-600 mt-1">₹{totalSpent}</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{zIndex:0}} className="sticky top-0 z-10 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pt-4 pb-4">
          <NavigationBar />
        </div>

        <div className="mt-4">
          <Routes>
            <Route path="/" element={<Navigate to="products" replace />} />
            <Route path="products" element={<AvailableProducts />} />
            <Route path="orders" element={<OrderHistory />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};