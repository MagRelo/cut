import { useAuth } from '../../contexts/AuthContext';

export function HelpButton() {
  const { openInstructions } = useAuth();

  return (
    <button
      onClick={openInstructions}
      className='inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800'
      aria-label='Open instructions'>
      How to Play
    </button>
  );
}
