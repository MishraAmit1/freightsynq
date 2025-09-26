// api/lr-templates.js (COMPLETE FIXED VERSION)
import { generateEnhancedLRPDF } from '@/lib/enhancedLRGenerator';
import { supabase } from '@/lib/supabase';

// api/lr-templates.js (UPDATED)
export const getAvailableTemplates = async () => {
    return [
        {
            code: 'standard',
            name: 'Standard Format',
            description: 'Most commonly used LR format with all essential details',
            preview_url: '/assets/templates/standard-preview.png',
            features: ['Complete Details', 'GST Ready', 'Professional Look']
        },
        {
            code: 'minimal',
            name: 'Minimal Format',
            description: 'Simple and clean format with only essential fields',
            preview_url: '/assets/templates/minimal-preview.png',
            features: ['Quick Print', 'Essential Fields Only', 'Space Efficient']
        },
        {
            code: 'detailed',
            name: 'Detailed Format',
            description: 'Comprehensive format with all possible fields and sections',
            preview_url: '/assets/templates/detailed-preview.png',
            features: ['All Fields', 'Extra Notes', 'Multiple Sections']
        },
        {
            code: 'gst_invoice',
            name: 'GST Invoice Style',
            description: 'GST compliant format designed like a tax invoice',
            preview_url: '/assets/templates/gst-preview.png',
            features: ['GST Compliant', 'Tax Breakdown', 'Invoice Style']
        }
    ];
};

// Check if company has template configured - FIXED
export const checkTemplateStatus = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('document_templates')
            .select('id, template_name, header_config, style_config, footer_config, custom_fields')
            .eq('template_type', 'LR')
            .eq('is_default', true)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return { hasTemplate: !!data, template: data };
    } catch (error) {
        console.error('Error checking template status:', error);
        return { hasTemplate: false, template: null };
    }
};

// Save selected template - FIXED
export const selectTemplate = async (templateCode, customization = {}) => {
    try {
        // Get current user and their company
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('User not authenticated');
        }

        const templates = await getAvailableTemplates();
        const selectedTemplate = templates.find(t => t.code === templateCode);

        if (!selectedTemplate) {
            throw new Error('Invalid template selected');
        }

        // Check if template already exists
        const existing = await checkTemplateStatus();
        if (existing.hasTemplate) {
            throw new Error('Template already configured. Use update function to change.');
        }

        const templateData = {
            template_type: 'LR',
            template_name: selectedTemplate.name,
            is_default: true,
            header_config: {
                show_logo: true,
                logo_position: 'left',
                show_gst: true,
                show_pan: false,
                show_address: true,
                company_name_size: '24px',
                ...customization.header_config,
                logo_url: customization.logo_url
            },
            visible_fields: {
                lr_number: true,
                booking_id: true,
                date: true,
                consignor: true,
                consignee: true,
                from_location: true,
                to_location: true,
                material_description: true,
                vehicle_number: true,
                driver_details: true,
                weight: templateCode === 'detailed',
                quantity: true,
                freight_charges: templateCode !== 'minimal',
                payment_mode: templateCode === 'detailed'
            },
            custom_fields: [
                {
                    key: 'base_template_code',
                    value: templateCode
                }
            ],
            footer_config: {
                show_terms: true,
                terms_text: 'Goods once sent will not be taken back',
                show_signature: true,
                signature_labels: ['Consignor', 'Driver', 'Consignee'],
                ...customization.footer_config
            },
            style_config: {
                font_size: '12px',
                font_family: 'Arial',
                primary_color: '#000000',
                secondary_color: '#666666',
                ...customization.style_config
            }
        };

        const { data, error } = await supabase
            .from('document_templates')
            .insert([templateData])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error selecting template:', error);
        throw error;
    }
};

// Generate LR with template - COMPLETELY FIXED
export const generateLRWithTemplate = async (bookingId) => {
    try {
        const { hasTemplate, template, company } = await getCurrentTemplateWithCompany();
        if (!hasTemplate) throw new Error('No LR template configured. Please complete setup.');

        let booking;
        if (bookingId === 'preview-mode') {
            booking = {
                id: 'preview-id', booking_id: 'PREVIEW-001', lr_number: 'LR-PREVIEW',
                lr_date: new Date().toISOString(), consignor: { name: 'Sample Consignor Company' },
                consignee: { name: 'Sample Consignee Company' }, from_location: 'Mumbai, Maharashtra',
                to_location: 'Delhi, NCR', material_description: 'Sample goods for template preview',
                cargo_units: '10 boxes', vehicle_number: 'MH-01-AB-1234', driver_name: 'Sample Driver',
                driver_phone: '9999999999'
            };
        } else {
            const { data, error } = await supabase
                .from('bookings')
                .select(`*, consignor:parties!consignor_id(*), consignee:parties!consignee_id(*), vehicle_assignments!left(*, owned_vehicle:owned_vehicles(*), hired_vehicle:hired_vehicles(*), driver:drivers(*))`)
                .eq('id', bookingId).single();
            if (error || !data) throw new Error('Booking not found');
            booking = data;

            const activeAssignment = booking.vehicle_assignments?.find(va => va.status === 'ACTIVE');
            if (activeAssignment) {
                const vehicle = activeAssignment.vehicle_type === 'OWNED' ? activeAssignment.owned_vehicle : activeAssignment.hired_vehicle;
                booking.vehicle_number = vehicle?.vehicle_number;
                booking.driver_name = activeAssignment.driver?.name;
                booking.driver_phone = activeAssignment.driver?.phone;
            }
        }

        const baseTemplateCode = template.custom_fields?.find(f => f.key === 'base_template_code')?.value || 'standard';

        generateEnhancedLRPDF(booking, template, company, baseTemplateCode);
        return { success: true };
    } catch (error) {
        console.error('❌ Error in generateLRWithTemplate:', error);
        throw error;
    }
};
// api/lr-templates.js (UPDATED - Fix the errors)

// Add a new function for template updates
export const changeTemplate = async (templateCode, customization = {}) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
        const companyId = userData?.company_id;
        if (!companyId) throw new Error("Company ID not found for the user.");

        const templates = await getAvailableTemplates();
        const selectedTemplate = templates.find(t => t.code === templateCode);
        if (!selectedTemplate) throw new Error('Invalid template selected');

        // --- FIX PART 1: Update companies table first WITH WHERE CLAUSE ---
        const { error: companyUpdateError } = await supabase
            .from('companies')
            .update({
                name: customization.company_details.name,
                address: customization.company_details.address,
                city: customization.company_details.city,
                state: customization.company_details.state,
                gst_number: customization.company_details.gst,
                pan_number: customization.company_details.pan,
                phone: customization.company_details.phone,
                email: customization.company_details.email,
            })
            .eq('id', companyId); // <-- YEH THA MISSING PART

        if (companyUpdateError) {
            console.error('Error updating company details:', companyUpdateError);
            throw companyUpdateError;
        }

        const { data: existingTemplate } = await supabase
            .from('document_templates')
            .select('id')
            .eq('company_id', companyId) // <-- Yeh bhi add karna zaroori hai
            .eq('template_type', 'LR')
            .eq('is_default', true)
            .single();

        // --- FIX PART 2: Prepare template data WITHOUT company_details ---
        const templateData = {
            company_id: companyId, // <-- Yeh bhi add karna zaroori hai
            template_type: 'LR',
            template_name: selectedTemplate.name,
            is_default: true,
            header_config: {
                ...customization.header_config,
                logo_url: customization.logo_url  // <-- YEH LINE IMPORTANT HAI
            },
            visible_fields: customization.visible_fields,
            custom_fields: [{ key: 'base_template_code', value: templateCode }],
            footer_config: customization.footer_config,
            style_config: customization.style_config
        };
        console.log('Saving header_config:', templateData.header_config);
        if (existingTemplate) {
            const { data, error } = await supabase
                .from('document_templates')
                .update(templateData)
                .eq('id', existingTemplate.id)
                .select().single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('document_templates')
                .insert([templateData])
                .select().single();
            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error in changeTemplate function:', error);
        throw error;
    }
};

// Get current template with company details
export const getCurrentTemplateWithCompany = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data: userData } = await supabase.from('users').select('company_id').eq('id', user.id).single();
        const companyId = userData?.company_id;
        if (!companyId) throw new Error("Company ID not found for the user.");

        const { data: template, error: templateError } = await supabase
            .from('document_templates')
            .select('*')
            .eq('company_id', companyId)
            .eq('template_type', 'LR')
            .eq('is_default', true)
            .single();

        if (templateError && templateError.code !== 'PGRST116') throw templateError;
        console.log('Template from DB:', template);
        console.log('Header config:', template?.header_config);
        console.log('Logo position:', template?.header_config?.logo_position);
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();
        if (companyError) throw companyError;

        return { hasTemplate: !!template, template, company };
    } catch (error) {
        console.error('Error getting current template:', error);
        throw error;
    }
};