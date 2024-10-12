import React, { useState } from 'react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(''); // State to hold response messages

  async function register(ev) {
    ev.preventDefault();
    const response = await fetch('http://localhost:4000/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'Content-Type': 'application/json' },
    });

    // Check if the response is OK
    if (response.ok) {
      const data = await response.text(); // Get the response text
      setMessage(data); // Set the message to show to the user
      alert('registration successful');
    } else {
      setMessage('Registration failed. Please try again.'); // Error handling
      alert('registration failed. Please try again.');
    }
  }

  return (
    <form className='register' onSubmit={register}>
      <h1>Register</h1>
      <input
        type="text"
        placeholder="username"
        value={username}
        onChange={(ev) => setUsername(ev.target.value)}
      />
      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
      />
      <button>Register</button>
      {message && <p>{message}</p>} {/* Show the response message */}
    </form>
  );
}
