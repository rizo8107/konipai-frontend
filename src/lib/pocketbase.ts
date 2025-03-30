import PocketBase from 'pocketbase';

// Initialize PocketBase with the URL from environment variables
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);

// Add a timeout to PocketBase requests
const AUTH_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;

// Auto authenticate with admin credentials
export const initAdmin = async (retryCount = 0) => {
  try {
    if (retryCount > MAX_RETRIES) {
      console.error('Max authentication retries reached');
      throw new Error('Failed to authenticate after multiple attempts');
    }
    
    // Set a timeout for the authentication request
    const authPromise = pb.admins.authWithPassword(
      import.meta.env.POCKETBASE_ADMIN_EMAIL || 'nnirmal7107@gmail.com',
      import.meta.env.POCKETBASE_ADMIN_PASSWORD || 'Kamala@7107'
    );
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Authentication timed out')), AUTH_TIMEOUT);
    });
    
    const authData = await Promise.race([authPromise, timeoutPromise]);
    console.log('Admin authenticated successfully');
    return authData;
  } catch (error) {
    console.error(`Admin authentication failed (attempt ${retryCount + 1}):`, error);
    
    // Check if it's a network error (status 0) and retry
    if (error?.status === 0 && retryCount < MAX_RETRIES) {
      console.log(`Retrying authentication in ${(retryCount + 1) * 1000}ms...`);
      await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
      return initAdmin(retryCount + 1);
    }
    
    // If it's not a network error or we've exceeded retries, throw the error
    throw error;
  }
};

// Initialize admin authentication with a more graceful failure approach
let authInitialized = false;
initAdmin()
  .then(() => {
    authInitialized = true;
    console.log('Initial admin authentication successful');
  })
  .catch(error => {
    console.error('Initial admin authentication failed, will retry on demand:', error);
  });

// Helper function to ensure admin authentication
export const ensureAdminAuth = async () => {
  try {
    // If auth is valid, return the model
    if (pb.authStore.isValid && pb.authStore.model?.admin) {
      return pb.authStore.model;
    }
    
    // Otherwise try to authenticate
    return await initAdmin();
  } catch (error) {
    console.error('Failed to ensure admin authentication:', error);
    throw error;
  }
};

// Helper function for admin login
export const authenticateAdmin = async (email: string, password: string) => {
  try {
    const authData = await pb.admins.authWithPassword(email, password);
    console.log('Admin authenticated with credentials');
    return authData;
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

// Helper functions for orders
export const getOrders = async (limit = 50) => {
  try {
    await ensureAdminAuth();
    const records = await pb.collection('orders').getList(1, limit, {
      sort: '-created', 
      expand: 'user_id,shipping_address',
    });
    return records;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

export const getOrderById = async (id: string) => {
  try {
    await ensureAdminAuth();
    const record = await pb.collection('orders').getOne(id, {
      expand: 'user_id,shipping_address,items',
    });
    return record;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: string) => {
  try {
    await ensureAdminAuth();
    const record = await pb.collection('orders').update(id, { status });
    return record;
  } catch (error) {
    console.error(`Error updating order ${id}:`, error);
    throw error;
  }
};

// Get dashboard metrics
export const getDashboardMetrics = async () => {
  try {
    await ensureAdminAuth();
    
    // Get all orders to calculate metrics
    const ordersResult = await pb.collection('orders').getFullList({
      sort: '-created',
    });
    
    // Calculate the metrics
    const totalOrders = ordersResult.length;
    
    const pendingOrders = ordersResult.filter(
      order => order.status === 'pending' || order.status === 'processing'
    ).length;
    
    const completedOrders = ordersResult.filter(
      order => order.status === 'delivered'
    ).length;
    
    // Calculate revenue metrics
    const totalRevenue = ordersResult.reduce((sum, order) => sum + (order.total || 0), 0);
    
    const averageOrderValue = totalOrders > 0 
      ? totalRevenue / totalOrders 
      : 0;
    
    // Calculate today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const revenueToday = ordersResult
      .filter(order => {
        const orderDate = new Date(order.created);
        return orderDate >= today;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);
    
    return {
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      completed_orders: completedOrders,
      total_revenue: totalRevenue,
      average_order_value: averageOrderValue,
      revenue_today: revenueToday
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw error;
  }
};

// Get revenue data for chart (monthly revenue)
export const getMonthlyRevenueData = async () => {
  try {
    await ensureAdminAuth();
    
    // Get all orders
    const ordersResult = await pb.collection('orders').getFullList({
      sort: 'created',
    });
    
    // Get current year
    const currentYear = new Date().getFullYear();
    
    // Create an object to store monthly revenue
    const monthlyRevenue = {
      'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
      'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };
    
    // Calculate revenue for each month
    ordersResult.forEach(order => {
      const orderDate = new Date(order.created);
      
      // Only include orders from current year
      if (orderDate.getFullYear() === currentYear) {
        const month = orderDate.toLocaleString('default', { month: 'short' });
        monthlyRevenue[month] += (order.total || 0);
      }
    });
    
    // Convert to array format expected by chart
    return Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue
    }));
  } catch (error) {
    console.error('Error fetching monthly revenue data:', error);
    throw error;
  }
};

export const getImageUrl = (collectionId: string, recordId: string, fileName: string) => {
  if (!collectionId || !recordId || !fileName) {
    console.warn('Missing parameters for getImageUrl', { collectionId, recordId, fileName });
    return 'https://placehold.co/400x400/e2e8f0/64748b?text=No+Image';
  }
  return `${import.meta.env.VITE_POCKETBASE_URL}/api/files/${collectionId}/${recordId}/${fileName}`;
};
