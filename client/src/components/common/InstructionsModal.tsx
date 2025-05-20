interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 flex justify-center items-center z-50'>
      <div className='bg-white p-5 rounded-lg w-[90%] max-w-[500px] shadow-lg'>
        <div className='flex justify-between items-center mb-5'>
          <h2 className='text-2xl font-semibold m-0 flex items-center'>
            <img
              src='/cut-logo2.png'
              alt='Cut Logo'
              className='w-9 h-9 mr-2 float-left rounded-full border-2 border-gray-300'
            />
            Welcome to the Cut!
          </h2>
          <button
            onClick={onClose}
            className='text-gray-600 text-2xl hover:text-gray-800 cursor-pointer bg-transparent border-none p-0'>
            ×
          </button>
        </div>
        <div className='mb-5'>
          <p className='mb-2'>
            <b>the Cut</b> is a free weekly fantasy golf competition. Each week
            is a new game.
          </p>

          <h3 className='text-lg font-medium '>Create a Team</h3>
          <ul className='list-disc pl-5 space-y-2 mb-2.5'>
            <li>Select four golfers to compete in each tournament.</li>
          </ul>

          <h3 className='text-lg font-medium '>Join a League</h3>
          <ul className='list-disc pl-5 space-y-2 mb-2.5'>
            <li>Join a league or create your own and invite your friends!</li>
          </ul>
        </div>

        <hr className='my-4' />
        <div className='text-right'>
          <button
            onClick={onClose}
            className='bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition-colors'>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
