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
        .select('*, farmer:profiles!produce_farmer_id_fkey(*)')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading marketplace:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data received from the server');
      }
      
      setProduces(data);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduce || !user) return;

    setLoading(true);
    setError('');
    
    try {
      const totalPrice = selectedProduce.price * orderQuantity;

      // First check if the produce is still available and get farmer details
      const { data: produceCheck, error: checkError } = await supabase
        .from('produce')
        .select(`
          *,
          farmer:profiles!produce_farmer_id_fkey(*)
        `)
        .eq('id', selectedProduce.id)
        .eq('status', 'available')
        .maybeSingle();

      if (checkError) throw checkError;

      if (!produceCheck) {
        throw new Error('Product no longer available');
      }

      if (produceCheck.quantity < orderQuantity) {
        throw new Error('Not enough quantity available');
      }

      // Update the produce quantity
      const newQuantity = produceCheck.quantity - orderQuantity;
      const { error: produceError } = await supabase
        .from('produce')
        .update({ 
          quantity: newQuantity,
          status: newQuantity === 0 ? 'sold' : 'available'
        })
        .eq('id', selectedProduce.id)
        .eq('status', 'available');

      if (produceError) {
        console.error('Error updating produce:', produceError);
        throw produceError;
      }

      // Create the order
      const { error: orderError } = await supabase
        .from('orders')
        .insert({
          produce_id: selectedProduce.id,
          buyer_id: user.id,
          seller_id: produceCheck.farmer_id,
          quantity: orderQuantity,
          total_price: totalPrice,
          status: 'pending'
        });

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      // Reset state and reload marketplace
      setSelectedProduce(null);
      setOrderQuantity(1);
      await loadMarketplace();
    } catch (err) {
      console.error('Failed to place order:', err);
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = handleOrder;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-900">Available Produce</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg flex items-center shadow-sm">
          <AlertCircle className="h-5 w-5 mr-3" />
          {error}
        </div>
      )}

      {/* Search and Filter Section */}
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
          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
        >
          <option value="all">All Produce</option>
          <option value="low-to-high">Price: Low to High</option>
          <option value="high-to-low">Price: High to Low</option>
          <option value="available">Available Only</option>
        </select>
      </div>
      
      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProduces.map((produce) => (
          <div
            key={produce.id}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100"
          >
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900">{produce.name}</h3>
              <p className="mt-2 text-gray-600">{produce.description}</p>
              <div className="mt-4">
                <p className="text-3xl font-bold text-gray-900">
                  ₹{produce.price}
                  <span className="text-sm text-gray-500">/{produce.unit}</span>
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Available: {produce.quantity} {produce.unit}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduce(produce)}
                disabled={produce.quantity === 0}
                className={`mt-6 w-full px-4 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  produce.quantity === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                }`}
              >
                {produce.quantity === 0 ? 'Out of Stock' : 'Purchase'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Modal */}
      {selectedProduce && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Purchase {selectedProduce.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity ({selectedProduce.unit})</label>
                <input
                  type="number"
                  min="1"
                  max={selectedProduce.quantity}
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), selectedProduce.quantity))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="text-right text-lg font-semibold text-gray-900">
                Total: ₹{(selectedProduce.price * orderQuantity).toFixed(2)}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedProduce(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};