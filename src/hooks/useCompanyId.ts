import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export const useCompanyId = () => {
    const { userProfile, company } = useAuth();
    // Prefer userProfile.company_id; fallback to company.id
    const companyId = useMemo(
        () => userProfile?.company_id || company?.id || null,
        [userProfile?.company_id, company?.id]
    );
    return companyId;
};