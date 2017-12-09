

# Setting DB
## Init
```sql
heroku pg:psql
SSL connection (protocol: TLSv1.2, cipher: ECDHE-RSA-AES256-GCM-SHA384, bits: 256, compression: off)
Type "help" for help.

YOUR-APP-NAME::DATABASE=> create table configs (key text PRIMARY KEY, value text, created_at timestamp default current_timestamp, updated_at timestamp default current_timestamp);
CREATE TABLE

YOUR-APP-NAME::DATABASE=> insert into configs (key, value) values 
-- slack
-- https://api.slack.com/custom-integrations/outgoing-webhooks
-- https://api.slack.com/custom-integrations/incoming-webhooks
('outgoing_token', 'YOUR-Outgoing-Webhooks-Token'), 
('incoming_url', 'YOUR-Incoming-Webhooks-Url'),
-- ifttt
-- https://ifttt.com/maker_webhooks
('ifttt_key', 'YOUR-IFTTT-api-key'),
-- google api
-- https://developers.google.com/drive/v3/web/quickstart/nodejs#step_1_turn_on_the_api_name
('google_client_secret_json', 'YOUR-client_secret.json-TEXT'),
('google_auth_token_json', '') -- blank
;
```

```sql
-- open google api sdk
-- https://developers.google.com/drive/v3/web/quickstart/nodejs#step_1_turn_on_the_api_name


```

## Update
```sql
YOUR-APP-NAME::DATABASE=> update configs set value = 'NEW-Token' where key = 'outgoing_token';
YOUR-APP-NAME::DATABASE=> update configs set value = 'NEW-Url' where key = 'incoming_url';
```