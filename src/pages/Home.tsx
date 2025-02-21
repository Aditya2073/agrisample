import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, ShoppingBag } from 'lucide-react';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold text-green-800 mb-4">
            AgriConnect
          </h1>
          <p className="text-xl text-gray-600">
            Connecting Farmers Directly with Buyers
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-green-100/50">
            <Sprout className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-semibold mb-4 text-green-800">
              For Farmers
            </h2>
            <p className="text-gray-600 mb-6">
              List your produce and connect directly with buyers. Get better prices
              for your harvest.
            </p>
            <Link
              to="/register?role=farmer"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Join as Farmer
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-blue-100/50">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-semibold mb-4 text-blue-800">
              For Buyers
            </h2>
            <p className="text-gray-600 mb-6">
              Source fresh produce directly from farmers. Get quality products at
              fair prices.
            </p>
            <Link
              to="/register?role=buyer"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join as Buyer
            </Link>
          </div>
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};