import { create } from 'zustand';
import { Product } from '../domain/types';
import { productRepository } from '../infrastructure/repositories/ProductRepository';

interface ProductsStore {
    products: Product[];
    loading: boolean;
    error: string | null;
    fetchProducts: () => Promise<void>;
    searchProducts: (query: string) => Promise<Product[]>;
}

export const useProductsStore = create<ProductsStore>((set) => ({
    products: [],
    loading: false,
    error: null,

    fetchProducts: async () => {
        set({ loading: true, error: null });
        try {
            const products = await productRepository.getAll();
            set({ products, loading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch products',
                loading: false
            });
        }
    },

    searchProducts: async (query: string) => {
        try {
            const results = await productRepository.search(query);
            return results;
        } catch (error) {
            console.error('Search failed:', error);
            return [];
        }
    },
}));
