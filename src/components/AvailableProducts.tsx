import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Produce } from '../types';
import { AlertCircle } from 'lucide-react';

export const AvailableProducts: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [produces, setProduces] = useState<Produce[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduce, setSelectedProduce] = useState<Produce | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [filteredProduces, setFilteredProduces] = useState<Produce[]>([]);

  useEffect(() => {
    loadMarketplace();
  }, []);

  useEffect(() => {
    const filtered = produces.filter((produce) => {
      const matchesSearch = produce.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        produce.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = selectedFilter === 'all' || (
        selectedFilter === 'low-to-high' ? true : 
        selectedFilter === 'high-to-low' ? true : 
        selectedFilter === 'available' ? produce.quantity > 0 : false
      );
      return matchesSearch && matchesFilter;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (selectedFilter === 'low-to-high') return a.price - b.price;
      if (selectedFilter === 'high-to-low') return b.price - a.price;
      return 0;
    });

    setFilteredProduces(sorted);
  }, [produces, searchTerm, selectedFilter]);

  const loadMarketplace = async () => {
    try {
      const { data, error } = await supabase
        .from('produce')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProduces(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduce || !user) return;

    setLoading(true);
    try {
      const totalPrice = selectedProduce.price * orderQuantity;

      // Start a transaction to update both orders and produce
      const { data: updatedProduce, error: produceError } = await supabase
        .from('produce')
        .update({ quantity: selectedProduce.quantity - orderQuantity })
        .eq('id', selectedProduce.id)
        .select()
        .single();

      if (produceError) throw produceError;

      const { error: orderError } = await supabase.from('orders').insert([
        {
          produce_id: selectedProduce.id,
          buyer_id: user.id,
          quantity: orderQuantity,
          total_price: totalPrice,
          seller_id: selectedProduce.farmer_id,
          status: 'pending'
        },
      ]);

      if (orderError) throw orderError;

      setSelectedProduce(null);
      await loadMarketplace();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Produce</h2>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center shadow-sm">
          <AlertCircle className="h-5 w-5 mr-3" />
          {error}
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="mt-12 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search produce..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          >
            <option value="all">All Produce</option>
            <option value="low-to-high">Price: Low to High</option>
            <option value="high-to-low">Price: High to Low</option>
            <option value="available">Available Only</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProduces.map((produce) => (
          <div
            key={produce.id}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100"
          >
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900">{produce.name}</h3>
              <p className="mt-2 text-gray-600">{produce.description}</p>
              <div className="mt-6 space-y-2">
                <p className="text-3xl font-bold text-gray-900">
                  ₹{produce.price}
                  <span className="text-sm text-gray-500">/{produce.unit}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Available: {produce.quantity} {produce.unit}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduce(produce)}
                className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-[1.02]"
              >
                Purchase
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Modal */}
      {selectedProduce && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Purchase Produce</h2>
            <form onSubmit={handleOrder} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedProduce.name}
                </label>
                <p className="text-gray-600">{selectedProduce.description}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({selectedProduce.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduce.quantity}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Number(e.target.value))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Price
                </label>
                <p className="text-3xl font-bold text-gray-900">
                  ₹{selectedProduce.price * orderQuantity}
                </p>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => setSelectedProduce(null)}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};