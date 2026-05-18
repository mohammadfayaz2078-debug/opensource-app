const getBaseUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
};

export const useImageUrl = () => {
  const getProfileImageUrl = (profilePath) => {
    if (!profilePath) return '';
    
    // If it's already a full URL, return as is
    if (profilePath.startsWith('http')) return profilePath;
    
    const baseUrl = getBaseUrl();
    
    // For Laravel storage paths
    if (profilePath.startsWith('storage/')) {
      return `${baseUrl}/${profilePath}`;
    }
    
    // Otherwise, assume it's stored in the profiles directory
    return `${baseUrl}/storage/${profilePath}`;
  };

  const getCompanyLogoUrl = (logoPath) => {
    if (!logoPath) return '';
    
    if (logoPath.startsWith('http')) return logoPath;
    
    const baseUrl = getBaseUrl();
    
    if (logoPath.startsWith('storage/')) {
      return `${baseUrl}/${logoPath}`;
    }
    
    return `${baseUrl}/storage/${logoPath}`;
  };

  const getDocumentUrl = (documentPath) => {
    if (!documentPath) return '';
    
    if (documentPath.startsWith('http')) return documentPath;
    
    const baseUrl = getBaseUrl();
    
    if (documentPath.startsWith('storage/')) {
      return `${baseUrl}/${documentPath}`;
    }
    
    return `${baseUrl}/storage/${documentPath}`;
  };

  return {
    getProfileImageUrl,
    getCompanyLogoUrl,
    getDocumentUrl,
  };
};