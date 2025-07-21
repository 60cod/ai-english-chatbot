import React from 'react';
import './App.css';
import EnglishChatBot from './components/EnglishChatBot';

function App() {
  return (
    <div className="App">
      <div className="min-h-screen bg-gray-100 py-8">
        <EnglishChatBot />
      </div>
    </div>
  );
}

export default App;