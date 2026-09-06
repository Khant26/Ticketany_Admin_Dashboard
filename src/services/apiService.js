import { API_CONFIG, getApiUrl } from '../config/api';

class ApiService {
    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.token = null;
        this.credentials = {
            email: API_CONFIG.serviceAccount.email,
            password: API_CONFIG.serviceAccount.password
        };
    }

    // Internal authentication - not user-facing
    async authenticate() {
        try {
            const response = await fetch(getApiUrl(API_CONFIG.endpoints.auth.login), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(this.credentials)
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.access_token || data.token || data.access;
                console.log('Service authenticated successfully');
                return { success: true, token: this.token };
            } else {
                console.error('Authentication failed:', data);
                return { success: false, error: data.error || data.detail || 'Authentication failed' };
            }
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, error: 'Network error during authentication' };
        }
    }

    // Set service credentials (call this during app initialization)
    setCredentials(email, password) {
        this.credentials = { email, password };
    }

    // Ensure we have a valid token
    async ensureAuthenticated() {
        if (!this.token) {
            const authResult = await this.authenticate();
            if (!authResult.success) {
                throw new Error(authResult.error);
            }
        }
        return this.token;
    }

    // Generic API request with authentication
    async apiRequest(endpoint, options = {}) {
        await this.ensureAuthenticated();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);

            // If unauthorized, try to re-authenticate once
            if (response.status === 401) {
                this.token = null;
                await this.ensureAuthenticated();
                config.headers['Authorization'] = `Bearer ${this.token}`;
                const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
                return await this.handleResponse(retryResponse);
            }

            return await this.handleResponse(response);
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    async handleResponse(response) {
        const data = await response.json();

        if (response.ok) {
            return { success: true, data };
        } else {
            return {
                success: false,
                error: data.error || data.detail || data.message || 'Request failed',
                status: response.status
            };
        }
    }

    // Fetch all orders
    async fetchOrders(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/orders/${queryParams ? `?${queryParams}` : ''}`;

            const result = await this.apiRequest(endpoint);

            if (result.success) {
                return { success: true, orders: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            return { success: false, error: 'Failed to fetch orders' };
        }
    }

    // Fetch specific order by ID
    async fetchOrderById(orderId) {
        try {
            const result = await this.apiRequest(`/orders/${orderId}/`);

            if (result.success) {
                return { success: true, order: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error fetching order:', error);
            return { success: false, error: 'Failed to fetch order' };
        }
    }

    // Fetch all tickets
    async fetchTickets(filters = {}) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const endpoint = `/tickets/${queryParams ? `?${queryParams}` : ''}`;

            const result = await this.apiRequest(endpoint);

            if (result.success) {
                return { success: true, tickets: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            return { success: false, error: 'Failed to fetch tickets' };
        }
    }

    // Fetch tickets for a specific order
    async fetchTicketsByOrder(orderId) {
        try {
            const result = await this.apiRequest(`/orders/${orderId}/tickets/`);

            if (result.success) {
                return { success: true, tickets: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error fetching order tickets:', error);
            return { success: false, error: 'Failed to fetch order tickets' };
        }
    }

    // Fetch user orders (if user-specific endpoint exists)
    async fetchUserOrders(userId) {
        try {
            const result = await this.apiRequest(`/users/${userId}/orders/`);

            if (result.success) {
                return { success: true, orders: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error fetching user orders:', error);
            return { success: false, error: 'Failed to fetch user orders' };
        }
    }

    // Update order status
    async updateOrderStatus(orderId, status) {
        try {
            const result = await this.apiRequest(`/orders/${orderId}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });

            if (result.success) {
                return { success: true, order: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            return { success: false, error: 'Failed to update order status' };
        }
    }

    // Update ticket status
    async updateTicketStatus(ticketId, status) {
        try {
            const result = await this.apiRequest(`/tickets/${ticketId}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });

            if (result.success) {
                return { success: true, ticket: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            return { success: false, error: 'Failed to update ticket status' };
        }
    }

    // Search orders
    async searchOrders(searchTerm) {
        try {
            const result = await this.apiRequest(`/orders/search/?q=${encodeURIComponent(searchTerm)}`);

            if (result.success) {
                return { success: true, orders: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error searching orders:', error);
            return { success: false, error: 'Failed to search orders' };
        }
    }

    // Get order statistics
    async getOrderStats() {
        try {
            const result = await this.apiRequest('/orders/stats/');

            if (result.success) {
                return { success: true, stats: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Error fetching order stats:', error);
            return { success: false, error: 'Failed to fetch order stats' };
        }
    }
}

// Create and export a singleton instance
const apiService = new ApiService();

export default apiService;