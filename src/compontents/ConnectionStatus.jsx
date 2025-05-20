import React, { useEffect, useState } from 'react';

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return (
    <div  className='flex justify-center text-2xl text-center bg-gray-300 p-2 w-27 rounded-md' 
      style={{
        color: isOnline ? 'green' : 'red',
      }}
    >
      {isOnline ? 'Online' : 'Offline'}


    </div>
  );
};

export default ConnectionStatus;
