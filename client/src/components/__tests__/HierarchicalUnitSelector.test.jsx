import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HierarchicalUnitSelector from '../HierarchicalUnitSelector';

// Mock Translation
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key, fallback) => {
            const translations = {
                'properties.unit_type.apartment': 'Apartamento',
                'properties.unit_type.house': 'Casa',
                'properties.unit_type.commercial': 'Local',
                'user_management.table.unit': 'Unidad', // Fallback
                'properties.hierarchy.root': 'Root',
                'common.no_items': 'No items',
                'properties.add_sub_block': 'Add Block',
                'properties.add_unit': 'Add Unit',
                'properties.structure_name': 'Name',
                'properties.structure_type': 'Type',
                'properties.types.block': 'Block',
                'properties.types.portal': 'Portal',
                'properties.types.staircase': 'Staircase',
                'properties.types.tower': 'Tower',
                'properties.types.level': 'Level',
                'properties.unit_number': 'Unit No',
                'properties.unit_type.apartment': 'Apartment',
                'properties.unit_type.house': 'House',
                'properties.unit_type.commercial': 'Commercial',
                'properties.coefficient': 'Coefficient',
                'properties.parking_slots': 'Parking',
                'properties.has_storage': 'Storage',
                'common.cancel': 'Cancel',
                'common.create': 'Create',
                'common.saving': 'Saving...'
            };
            return translations[key] || fallback || key;
        }
    }),
}));

// Mock API URL
vi.mock('../config', () => ({
    API_URL: 'http://localhost:5001'
}));

// Mock Components to simplify
vi.mock('./GlassSelect', () => ({
    default: ({ value, onChange, options }) => (
        <select data-testid="glass-select" value={value} onChange={onChange}>
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    )
}));

vi.mock('./ModalPortal', () => ({
    default: ({ children }) => <div data-testid="modal-portal">{children}</div>
}));


describe('HierarchicalUnitSelector Component', () => {
    const mockBlocks = [
        {
            id: 1,
            name: 'Block A',
            parent_id: null,
            structure_type: 'block',
            units: [
                { id: 101, unit_number: '101', type: 'apartment', itemType: 'unit' },
                { id: 102, unit_number: '102', type: 'house', itemType: 'unit' }, // Should use House
                { id: 103, unit_number: '103', type: 'commercial', itemType: 'unit' }, // Should use Commercial
                { id: 104, unit_number: '104', type: null, itemType: 'unit' } // Should fallback or default
            ]
        }
    ];

    const mockCommunity = { community_id: 'comm-123' };
    const onSelectUnit = vi.fn();
    const onCancel = vi.fn();
    const onStructureChange = vi.fn();

    it('displays units with correct type prefix inside a block', async () => {
        render(
            <HierarchicalUnitSelector
                blocks={mockBlocks}
                activeCommunity={mockCommunity}
                onSelectUnit={onSelectUnit}
                onCancel={onCancel}
                onStructureChange={onStructureChange}
            />
        );

        // Initially shows root items (Block A)
        // Click on Block A to navigate into it
        fireEvent.click(screen.getByText('Block A'));

        // Now should see units
        // Check for Apartment 101
        expect(screen.getByText('Apartment 101')).toBeInTheDocument();

        // Check for House 102
        expect(screen.getByText('House 102')).toBeInTheDocument();

        // Check for Commercial 103
        expect(screen.getByText('Commercial 103')).toBeInTheDocument();

        // Check fallback for null type -> defaults to apartment via 'OR' or maybe just 'Apartment' if undefined key?
        // Code: t(`properties.unit_type.${item.type || 'apartment'}`, ...)
        // So null -> 'apartment' -> Apartment
        expect(screen.getByText('Apartment 104')).toBeInTheDocument();
    });
});
