import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Properties from '../../pages/Properties';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('../../components/DashboardLayout', () => ({
    default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>
}));
vi.mock('../../components/GlassLoader', () => ({
    default: () => <div data-testid="glass-loader">Loading...</div>
}));
vi.mock('../../components/ModalPortal', () => ({
    default: ({ children }) => <div data-testid="modal-portal">{children}</div>
}));
vi.mock('../../components/ConfirmationModal', () => ({
    default: ({ isOpen, onConfirm }) => isOpen ? (
        <div data-testid="confirmation-modal">
            <button onClick={onConfirm}>Confirm Delete</button>
        </div>
    ) : null
}));
vi.mock('../../components/properties/BlockCard', () => ({
    default: ({ block, onAddUnit, onDeleteBlock }) => (
        <div data-testid="block-card">
            <h3>{block.name}</h3>
            <button onClick={() => onAddUnit(block.id)}>Add Unit</button>
            <button onClick={() => onDeleteBlock(block.id)}>Delete Block</button>
        </div>
    )
}));

// Mock Auth
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 1, profile: { full_name: 'Test User' } },
        activeCommunity: { id: 1 },
        hasAnyRole: () => true // Admin
    })
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

const renderProperties = () => {
    return render(
        <MemoryRouter>
            <Properties />
        </MemoryRouter>
    );
};

describe('Properties Page', () => {
    const mockBlocks = [
        { id: 1, name: 'Block A', type: 'block', units: [], parent_id: null, children: [] }
    ];
    const mockUsers = [{ id: 1, full_name: 'User One' }];
    const mockAmenities = [{ id: 1, name: 'Pool' }];

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn((url, options) => {
            if (url.includes('/api/properties/blocks') && (!options || !options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockBlocks)
                });
            }
            if (url.includes('/api/properties/users')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockUsers)
                });
            }
            if (url.includes('/api/amenities') && (!options || !options.method || options.method === 'GET')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockAmenities)
                });
            }
            if (options?.method === 'POST' || options?.method === 'DELETE' || options?.method === 'PUT') {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true })
                });
            }
            return Promise.resolve({ ok: false });
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders blocks list', async () => {
        renderProperties();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        expect(screen.getByText('properties.title')).toBeInTheDocument();
        expect(screen.getByText('Block A')).toBeInTheDocument();
        expect(screen.getByText('properties.units_structure')).toBeInTheDocument();
    });

    it('opens create block modal and submits', async () => {
        renderProperties();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        const addBlockBtns = screen.getAllByRole('button');
        const addBlockBtn = addBlockBtns.find(btn => btn.textContent.includes('properties.add_block'));
        fireEvent.click(addBlockBtn);

        await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

        fireEvent.change(screen.getByPlaceholderText('properties.block_placeholder'), { target: { value: 'New Block' } });
        fireEvent.click(screen.getByRole('button', { name: 'properties.add_btn' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/properties/blocks'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('New Block')
            })
        );
    });

    it('opens create unit modal via block card', async () => {
        renderProperties();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('Add Unit')); // Trigger mocked BlockCard action

        await waitFor(() => expect(screen.getByText('properties.add_unit')).toBeInTheDocument());

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('properties.unit_placeholder'), { target: { value: '101' } });
        // The submit button is disabled unless fields are valid.
        // We simplified the mock so we just assume form works if required filled.

        const submitBtn = screen.getByText('properties.add_unit_btn');
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/properties/units'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('101')
                })
            );
        });
    });

    it('switches to amenities and creates one', async () => {
        renderProperties();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('properties.amenities'));

        const addBtn = screen.getByText('properties.add_amenity'); // "+" button text depends on translation
        fireEvent.click(addBtn);

        await waitFor(() => expect(screen.getAllByText('properties.create_amenity')[0]).toBeInTheDocument());

        fireEvent.change(screen.getByPlaceholderText('e.g. Swimming Pool, BBQ Area'), { target: { value: 'Gym' } });

        // Find form submit
        const form = screen.getByRole('dialog').querySelector('form');
        fireEvent.submit(form);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/amenities'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('Gym')
                })
            );
        });
    });

    it('deletes a block', async () => {
        renderProperties();
        await waitFor(() => expect(screen.queryByTestId('glass-loader')).not.toBeInTheDocument());

        fireEvent.click(screen.getByText('Delete Block')); // Mocked button

        await waitFor(() => expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Confirm Delete'));

        await waitFor(() => expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument());

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/properties/blocks/1'),
            expect.objectContaining({ method: 'DELETE' })
        );
    });
});
