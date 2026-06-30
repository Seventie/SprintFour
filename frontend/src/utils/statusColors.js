export const getStatusColors = (status) => {
  switch (status) {
    case 'missed':
      return 'bg-red-100 text-red-900 border-red-500 hover:bg-red-200 ring-2 ring-red-500 animate-pulse';
    case 'false_positive':
      return 'bg-amber-100 text-amber-900 border-amber-500 hover:bg-amber-200';
    case 'redacted':
      return 'bg-gray-200 text-gray-800 border-gray-400 hover:bg-gray-300';
    case 'flagged':
      return 'bg-purple-100 text-purple-900 border-purple-500 hover:bg-purple-200';
    case 'added':
      return 'bg-blue-100 text-blue-900 border-blue-500 hover:bg-blue-200';
    case 'dismissed':
      return 'bg-transparent text-gray-400 border-transparent hover:bg-gray-50';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};
