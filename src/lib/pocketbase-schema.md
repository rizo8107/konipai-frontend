# PocketBase Schema for WhatsApp Activities

## Collection: whatsapp_activities

This collection stores all WhatsApp message activities for tracking and auditing purposes.

### Fields:

| Field Name      | Type     | Required | Options                      |
|----------------|----------|----------|------------------------------|
| id             | ID       | Auto     | Primary key                  |
| order_id       | Relation | Yes      | Related to orders collection |
| recipient      | Text     | Yes      | Phone number of recipient    |
| template_name  | Text     | Yes      | Template used for message    |
| message_content| JSON     | Yes      | Content of the message       |
| status         | Select   | Yes      | Options: sent, failed        |
| timestamp      | DateTime | Yes      | When message was sent        |
| error_message  | Text     | No       | Error details if failed      |

### Indexes:
- order_id (for faster queries by order)
- timestamp (for sorting by most recent)

### API Endpoints:
- GET /api/collections/whatsapp_activities/records
- POST /api/collections/whatsapp_activities/records
- GET /api/collections/whatsapp_activities/records/:id
- PATCH /api/collections/whatsapp_activities/records/:id
- DELETE /api/collections/whatsapp_activities/records/:id
