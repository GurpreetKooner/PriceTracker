import React, { useState, useEffect } from 'react';
import { Search, LogOut, Link, Trash2, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleLogout } from '../auth-utils';
import { secureStorage } from '../auth-utils';
import amazon_logo from '../amazon_logo.png';
import ebay_logo from '../ebay_logo.png'

function shortenAmazonUrl(url) {
  try {
      // Create URL object to parse the input URL
      const urlObject = new URL(url);
      
      // Check if it's an Amazon URL
      if (!urlObject.hostname.includes('amazon')) {
          throw new Error('Not an Amazon URL');
      }
      
      // Extract ASIN using different methods
      let asin;
      
      // Method 1: From /dp/ path
      const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
      if (dpMatch) {
          asin = dpMatch[1];
      }
      
      // Method 2: From /gp/product/ path
      const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/);
      if (gpMatch) {
          asin = gpMatch[1];
      }
      
      // Method 3: From /product/ path
      const productMatch = url.match(/\/product\/([A-Z0-9]{10})/);
      if (productMatch) {
          asin = productMatch[1];
      }
      
      // If no ASIN found, throw error
      if (!asin) {
          throw new Error('Could not find valid Amazon ASIN in URL');
      }
      
      // Construct shortened URL using the dp format
      const domain = urlObject.hostname;
      return `https://${domain}/dp/${asin}`;
      
  } catch (error) {
      throw new Error(`Invalid URL: ${error.message}`);
  }
}

function shortenEbayUrl(originalUrl) {
  try {
    // Extract item ID from eBay URL
    const itemIdMatch = originalUrl.match(/\/itm\/(\d+)/);
    
    if (itemIdMatch && itemIdMatch[1]) {
      // Return a simplified eBay URL with just the item ID
      return `https://ebay.com/itm/${itemIdMatch[1]}`;
    }
    
    // If no item ID found, return the original URL
    return originalUrl;
  } catch (error) {
    console.error('Error shortening eBay URL:', error);
    return originalUrl;
  }
}

const Main = () => {
  const [productUrl, setProductUrl] = useState('');
  const [userName, setUserName] = useState('');
  const [trackedItems, setTrackedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = secureStorage.getUserData();
    if (userData?.displayName) {
      setUserName(userData.displayName);
    }

    const fetchTrackedItems = async () => {
      try {
        const userEmail = userData?.email;
        const response = await fetch(
          `https://us-central1-macro-authority-435423-t4.cloudfunctions.net/get_tracked_items?email_id=${userEmail}`
        );
        const data = await response.json();
        if (data.items) {
          setTrackedItems(data.items);
        }
      } catch (error) {
        console.error('Error fetching tracked items:', error);
      }
    };

    fetchTrackedItems();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const urlObject = new URL(productUrl);
      let shortUrl;
      
      if (urlObject.hostname.includes('amazon')) {
        shortUrl = shortenAmazonUrl(productUrl);
        
        const userData = secureStorage.getUserData();
        const userEmail = userData?.email;
        
        if (!userEmail) {
          throw new Error('User email not found. Please log in again.');
        }
  
        const response = await fetch(
          'https://us-central1-macro-authority-435423-t4.cloudfunctions.net/amazon_validate_and_scrape',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: shortUrl,
              user_emailId: userEmail,
            }),
          }
        );
  
        const data = await response.json();
  
        if (response.status === 200) {
          alert(`Successfully added new url to track`);
          setProductUrl('');
  
          const refreshResponse = await fetch(
            `https://us-central1-macro-authority-435423-t4.cloudfunctions.net/get_tracked_items?email_id=${userEmail}`
          );
          const refreshData = await refreshResponse.json();
          if (refreshData.items) {
            setTrackedItems(refreshData.items);
          }
  
        } else if (response.status === 400) {
          throw new Error(data.error || 'Invalid Amazon URL');
        } else if (response.status === 404) {
          throw new Error(data.error || 'User not found');
        } else if (response.status === 500) {
          if (data.error && data.error.includes('Duplicate entry')) {
            throw new Error('This item is already being tracked');
          } else {
            throw new Error(data.error || 'An internal server error occurred');
          }
        } else {
          throw new Error('An unexpected error occurred');
        }
  
      } else if (urlObject.hostname.includes('ebay')) {
        shortUrl = shortenEbayUrl(productUrl);

        const userData = secureStorage.getUserData();
        const userEmail = userData?.email;
        
        if (!userEmail) {
          throw new Error('User email not found. Please log in again.');
        }

        const response = await fetch(
          'https://us-central1-macro-authority-435423-t4.cloudfunctions.net/ebay_validate_and_scrape',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: shortUrl,
              user_emailId: userEmail,
            }),
          }
        );
  
        const data = await response.json();
  
        if (response.status === 200) {
          alert(`Successfully added new url to track`);
          setProductUrl('');
  
          const refreshResponse = await fetch(
            `https://us-central1-macro-authority-435423-t4.cloudfunctions.net/get_tracked_items?email_id=${userEmail}`
          );
          const refreshData = await refreshResponse.json();
          if (refreshData.items) {
            setTrackedItems(refreshData.items);
          }
  
        } else if (response.status === 400) {
          throw new Error(data.error || 'Invalid Ebay URL');
        } else if (response.status === 404) {
          throw new Error(data.error || 'User not found');
        } else if (response.status === 500) {
          if (data.error && data.error.includes('Duplicate entry')) {
            throw new Error('This item is already being tracked');
          } else {
            throw new Error(data.error || 'An internal server error occurred');
          }
        } else {
          throw new Error('An unexpected error occurred');
        }

      } else {
        throw new Error('Not an Amazon or Ebay URL');
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      alert(error.message || 'Failed to process URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await handleLogout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLinkClick = (url) => {
    window.open(url, '_blank');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMilliseconds = now - date;
    
    // Return formatted date if the timestamp is invalid or in the future
    if (isNaN(diffInMilliseconds) || diffInMilliseconds < 0) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const truncateText = (text, limit) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
  };

  const handleDeleteItem = async (itemId) => {
    const userData = secureStorage.getUserData();
    const userEmail = userData?.email;
  
    try {
      const response = await fetch(
        'https://us-central1-macro-authority-435423-t4.cloudfunctions.net/delete_tracked_item',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            item_id: itemId,
            user_emailId: userEmail,
          }),
        }
      );
  
      if (response.ok) {
        // Remove the deleted item from the UI
        setTrackedItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
        console.log(`Item with ID ${itemId} deleted successfully.`);
        alert('Item successfully deleted!');
      } else {
        console.error(`Failed to delete item with ID ${itemId}.`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };
  

  // Price range indicator component
  const PriceRangeIndicator = ({ lowest, highest, current }) => {
    // If lowest and highest prices are the same, show a single price point
    if (lowest === highest) {
      return (
        <div className="relative w-full h-12 mt-4">
          <div className="absolute w-full h-2 bg-gray-200 rounded-full top-1/2 -translate-y-1/2">
            <div className="absolute h-full bg-blue-100 rounded-full" style={{ width: '100%' }} />
          </div>
          
          {/* Single price marker */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0">
            <div className="w-4 h-4 bg-blue-500 rounded-full shadow-md" />
            <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-medium text-gray-800 bg-white px-1">
                ${current}
              </span>
            </div>
          </div>
        </div>
      );
    }
  
    // Calculate the position for the current price marker
    const range = highest - lowest;
    const currentPosition = ((current - lowest) / range) * 100;
    
    // Determine if prices are too close together
    const isCurrentCloseToLowest = currentPosition < 15;
    const isCurrentCloseToHighest = currentPosition > 85;
  
    return (
      <div className="relative w-full h-16 mt-4">
        {/* Price range bar */}
        <div className="absolute w-full h-2 bg-gray-200 rounded-full top-1/2 -translate-y-1/2">
          <div className="absolute h-full bg-blue-100 rounded-full" style={{ width: '100%' }} />
        </div>
  
        {/* Lowest price marker */}
        <div className="absolute left-0 -translate-x-1/2 top-0" style={{ width: '2px' }}>
          <div className="w-1 h-4 bg-green-500 rounded-full" />
          <div className={`absolute ${isCurrentCloseToLowest ? 'top-8' : 'top-5'} left-1/2 -translate-x-1/2 whitespace-nowrap`}>
            <span className="text-xs text-gray-600 bg-white px-1">
              ${lowest}
            </span>
          </div>
        </div>
  
        {/* Highest price marker */}
        <div className="absolute right-0 translate-x-1/2 top-0" style={{ width: '2px' }}>
          <div className="w-1 h-4 bg-red-500 rounded-full" />
          <div className={`absolute ${isCurrentCloseToHighest ? 'top-8' : 'top-5'} left-1/2 -translate-x-1/2 whitespace-nowrap`}>
            <span className="text-xs text-gray-600 bg-white px-1">
              ${highest}
            </span>
          </div>
        </div>
  
        {/* Current price marker */}
        <div 
          className="absolute top-0" 
          style={{ left: `${currentPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-4 h-4 bg-blue-500 rounded-full shadow-md" />
          <div className={`absolute ${
            isCurrentCloseToLowest || isCurrentCloseToHighest ? 'top-12' : 'top-5'
          } left-1/2 -translate-x-1/2 whitespace-nowrap`}>
            <span className="text-xs font-medium text-gray-800 bg-white px-1">
              ${current}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">PriceTracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogoutClick}
                className="flex items-center text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Track Prices Effortlessly
          </h2>
          {userName && (
            <p className="mt-2 text-xl text-gray-700">
              Welcome, {userName}!
            </p>
          )}
          <p className="mt-4 text-lg text-gray-600">
            Enter any product URL below and we'll notify you when the price drops.
          </p>

          {/* New Platform Tracking Notice */}
          <div className="mt-4 flex justify-center items-center space-x-4">
            <div className="flex items-center space-x-4">
              <img src={amazon_logo} alt="amazon logo" width="80" />
              <img src={ebay_logo} alt="ebay logo" width="80" />
            </div>
            <span className="text-sm text-gray-500">
              Currently tracking products from Amazon and eBay only
            </span>
          </div>
        </div>

        {/* URL Input Form */}
        <div className="mt-10">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow">
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="Paste product URL here (e.g., https://amazon.com/product)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Start Tracking
                  </>
                )}
              </button>
            </div>
          </form>
          
          {/* Loading Overlay */}
          {isLoading && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                <Loader className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                <span className="text-blue-600">Analyzing product details...</span>
              </div>
            </div>
          )}
        </div>

        {/* Tracked Items or Features Section */}
        <div className="mt-20">
          {trackedItems.length > 0 ? (
            <div className="space-y-8">
              {trackedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-lg p-8 transition-all hover:shadow-xl"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-semibold text-gray-900 pr-4">
                          {truncateText(item.item_name, 100)}
                        </h3>
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={() => handleLinkClick(item.url)}
                            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Link className="h-5 w-5 mr-1" />
                            View
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)} className="flex items-center text-red-500 hover:text-red-600 transition-colors">
                            <Trash2 className="h-5 w-5" />
                            </button>

                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 mt-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span>
                        Last checked: {formatDate(item.last_checked)}
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                        Current Price: <span className="font-medium text-gray-900 ml-1">${parseFloat(item.price).toFixed(2)}</span>
                      </div>
                    </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <PriceRangeIndicator 
                      lowest={parseFloat(item.lowest_price)} 
                      highest={parseFloat(item.highest_price)} 
                      current={parseFloat(item.price)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Real-time Tracking</h3>
                  <p className="mt-2 text-gray-600">
                    Get instant notifications when prices change on your tracked items
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Price History</h3>
                  <p className="mt-2 text-gray-600">
                    View detailed price history charts and trends
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Multiple Stores</h3>
                  <p className="mt-2 text-gray-600">
                    Track prices across various online retailers
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Main;