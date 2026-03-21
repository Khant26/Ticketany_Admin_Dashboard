/**
 * SEO Utility Functions for Admin Dashboard
 */

export const updateAdminMetaTags = ({
  title = 'Ticket Admin Dashboard',
  description = 'Manage events, view sales analytics, handle orders and customer data.'
} = {}) => {
  // Update title
  document.title = title;

  // Update or create meta description
  let descTag = document.querySelector('meta[name="description"]');
  if (!descTag) {
    descTag = document.createElement('meta');
    descTag.name = 'description';
    document.head.appendChild(descTag);
  }
  descTag.content = description;
};

export const resetAdminMetaTags = () => {
  updateAdminMetaTags({
    title: 'Ticket Admin Dashboard',
    description: 'Manage events, view sales analytics, handle orders and customer data.'
  });
};
