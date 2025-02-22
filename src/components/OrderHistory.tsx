import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Order, Produce, Profile } from '../types';

interface OrderWithDetails extends Order {
  produce: Produce;
  seller: Profile;
  buyer: Profile;
}

export const OrderHistory: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (user?.id && mounted) {
      loadOrders();
    }
  }, [user?.id]);

  const loadOrders = async () => {
    try {
      // First fetch orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          produce:produce_id(
            id,
            name,
            description,
            price,
            quantity,
            status,
            created_at
          ),
          seller:seller_id(
            id,
            name,
            email
          ),
          buyer:buyer_id(
            id,
            name,
            email
          )
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (orderError) {
        console.error('Error fetching orders:', orderError);
        throw orderError;
      }

      if (!orderData) {
        throw new Error('No order data received');
      }

      // Transform the data to match the expected format
      const transformedOrders = orderData.map(order => ({
        ...order,
        produce: order.produce,
        seller: order.seller,
        buyer: order.buyer
      }));

      if (mounted) {
        setOrders(transformedOrders);
        setError(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load orders';
      console.error('Failed to load orders:', err);
      if (mounted) {
        setError(errorMessage);
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="mt-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-12 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => loadOrders()}
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Orders</h2>
      {orders.length === 0 ? (
        <div className="text-center text-gray-600 py-8">
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {order.produce?.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Order placed on {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Quantity</p>
                  <p className="mt-1">{order.quantity} units</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Price per unit</p>
                  <p className="mt-1">₹{order.produce?.price}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="mt-1 font-semibold text-green-600">₹{order.total_price}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Seller: {order.seller?.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};