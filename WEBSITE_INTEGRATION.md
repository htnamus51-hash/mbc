# Website Integration Guide

To connect your website (mbctherapy.com) to this dashboard, you can use the following API endpoint to send new patient registrations.

## Endpoint: `POST /api/registrations`

This is a public endpoint that accepts JSON payloads from your website's contact or registration form.

### Request Body (JSON)

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "123-456-7890",
  "message": "I would like to schedule an initial consultation.",
  "source": "mbctherapy.com"
}
```

### Example using `fetch` in JavaScript:

```javascript
const registerPatient = async (formData) => {
  try {
    const response = await fetch('https://your-api-url.com/api/registrations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        source: 'mbctherapy.com'
      }),
    });

    if (response.ok) {
      console.log('Registration sent successfully!');
    }
  } catch (error) {
    console.error('Error sending registration:', error);
  }
};
```

## Dashboard View

Once a registration is sent, it will appear in the **"New Patient Registrations"** section on the Admin Dashboard in real-time (after a page refresh or when the component mounts).
