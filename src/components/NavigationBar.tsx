import React from 'react';
import { NavLink } from 'react-router-dom';

export const NavigationBar: React.FC = () => {
  return (
    <nav className="bg-white shadow-lg rounded-lg p-4 mb-8">
      <ul className="flex space-x-8 justify-end">
        <li>
          <NavLink
            to="/buyer/products"
            className={({ isActive }) =>
              `text-lg font-medium transition-colors duration-200 ${isActive
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-green-600'
              }`
            }
          >
            Available Products
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/buyer/orders"
            className={({ isActive }) =>
              `text-lg font-medium transition-colors duration-200 ${isActive
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-green-600'
              }`
            }
          >
            Your Orders
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};