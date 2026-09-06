import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';

export const useOrdersData = (autoFetch = true) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialized, setInitialized] = useState(false);

    // Initialize the service with credentials
    const initializeService = useCallback(async (email, password) => {
        try {
            apiService.setCredentials(email, password);
            const authResult = await apiService.authenticate();

            if (authResult.success) {
                setInitialized(true);
                setError(null);
                return { success: true };
            } else {
                setError(authResult.error);
                return { success: false, error: authResult.error };
            }
        } catch {
            const errorMsg = 'Failed to initialize service';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
    }, []);

    // Fetch orders
    const fetchOrders = useCallback(async (filters = {}) => {
        if (!initialized) {
            setError('Service not initialized. Call initializeService first.');
            return { success: false, error: 'Service not initialized' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await apiService.fetchOrders(filters);

            if (result.success) {
                setOrders(result.orders);
                return { success: true, orders: result.orders };
            } else {
                setError(result.error);
                return { success: false, error: result.error };
            }
        } catch {
            const errorMsg = 'Failed to fetch orders';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [initialized]);

    // Fetch specific order
    const fetchOrderById = useCallback(async (orderId) => {
        if (!initialized) {
            return { success: false, error: 'Service not initialized' };
        }

        setLoading(true);
        try {
            const result = await apiService.fetchOrderById(orderId);
            return result;
        } catch {
            return { success: false, error: 'Failed to fetch order' };
        } finally {
            setLoading(false);
        }
    }, [initialized]);

    // Update order status
    const updateOrderStatus = useCallback(async (orderId, status) => {
        if (!initialized) {
            return { success: false, error: 'Service not initialized' };
        }

        try {
            const result = await apiService.updateOrderStatus(orderId, status);

            if (result.success) {
                // Update local state
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order.id === orderId
                            ? { ...order, status: status }
                            : order
                    )
                );
            }

            return result;
        } catch {
            return { success: false, error: 'Failed to update order status' };
        }
    }, [initialized]);

    // Search orders
    const searchOrders = useCallback(async (searchTerm) => {
        if (!initialized) {
            return { success: false, error: 'Service not initialized' };
        }

        setLoading(true);
        try {
            const result = await apiService.searchOrders(searchTerm);

            if (result.success) {
                setOrders(result.orders);
            }

            return result;
        } catch {
            return { success: false, error: 'Failed to search orders' };
        } finally {
            setLoading(false);
        }
    }, [initialized]);

    // Auto-fetch orders when service is initialized
    useEffect(() => {
        if (initialized && autoFetch) {
            fetchOrders();
        }
    }, [initialized, autoFetch, fetchOrders]);

    return {
        orders,
        loading,
        error,
        initialized,
        initializeService,
        fetchOrders,
        fetchOrderById,
        updateOrderStatus,
        searchOrders,
        setOrders
    };
};

export const useTicketsData = (autoFetch = true) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialized, setInitialized] = useState(false);

    // Initialize the service
    const initializeService = useCallback(async (email, password) => {
        try {
            apiService.setCredentials(email, password);
            const authResult = await apiService.authenticate();

            if (authResult.success) {
                setInitialized(true);
                setError(null);
                return { success: true };
            } else {
                setError(authResult.error);
                return { success: false, error: authResult.error };
            }
        } catch {
            const errorMsg = 'Failed to initialize service';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }
    }, []);

    // Fetch tickets
    const fetchTickets = useCallback(async (filters = {}) => {
        if (!initialized) {
            setError('Service not initialized. Call initializeService first.');
            return { success: false, error: 'Service not initialized' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await apiService.fetchTickets(filters);

            if (result.success) {
                setTickets(result.tickets);
                return { success: true, tickets: result.tickets };
            } else {
                setError(result.error);
                return { success: false, error: result.error };
            }
        } catch {
            const errorMsg = 'Failed to fetch tickets';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [initialized]);

    // Fetch tickets for specific order
    const fetchTicketsByOrder = useCallback(async (orderId) => {
        if (!initialized) {
            return { success: false, error: 'Service not initialized' };
        }

        setLoading(true);
        try {
            const result = await apiService.fetchTicketsByOrder(orderId);
            return result;
        } catch {
            return { success: false, error: 'Failed to fetch order tickets' };
        } finally {
            setLoading(false);
        }
    }, [initialized]);

    // Update ticket status
    const updateTicketStatus = useCallback(async (ticketId, status) => {
        if (!initialized) {
            return { success: false, error: 'Service not initialized' };
        }

        try {
            const result = await apiService.updateTicketStatus(ticketId, status);

            if (result.success) {
                // Update local state
                setTickets(prevTickets =>
                    prevTickets.map(ticket =>
                        ticket.id === ticketId
                            ? { ...ticket, status: status }
                            : ticket
                    )
                );
            }

            return result;
        } catch {
            return { success: false, error: 'Failed to update ticket status' };
        }
    }, [initialized]);

    // Auto-fetch tickets when service is initialized
    useEffect(() => {
        if (initialized && autoFetch) {
            fetchTickets();
        }
    }, [initialized, autoFetch, fetchTickets]);

    return {
        tickets,
        loading,
        error,
        initialized,
        initializeService,
        fetchTickets,
        fetchTicketsByOrder,
        updateTicketStatus,
        setTickets
    };
};