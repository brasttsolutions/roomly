insert into public.companies(id,name,document,email,timezone)
values ('10000000-0000-4000-8000-000000000001','Ágora Coworking','00.000.000/0001-00','operacao@agora.example','America/Sao_Paulo')
on conflict (id) do nothing;

insert into public.locations(id,company_id,name,address,city,state,zip_code,timezone)
values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Ágora Tech Park','Perini Business Park','Joinville','SC','89219-600','America/Sao_Paulo'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Centro Joinville','Rua do Príncipe, 330','Joinville','SC','89201-000','America/Sao_Paulo')
on conflict (id) do nothing;

insert into public.rooms(id,company_id,location_id,name,slug,description,capacity,hourly_price_cents)
values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Sala Executiva','sala-executiva','Sala de reunião executiva com videoconferência.',8,12000),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Sala Foco','sala-foco','Sala compacta para pequenos times.',4,7500),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Atelier Criativo','atelier-criativo','Sala flexível para workshops.',12,16500)
on conflict (company_id,slug) do nothing;

insert into public.room_images(company_id,room_id,url,position)
values
('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','/rooms/executiva.png',0),
('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','/rooms/foco.png',0),
('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','/rooms/atelier.png',0)
on conflict do nothing;

insert into public.room_features(id,name)
values
('50000000-0000-4000-8000-000000000001','Videoconferência'),
('50000000-0000-4000-8000-000000000002','Lousa'),
('50000000-0000-4000-8000-000000000003','Café'),
('50000000-0000-4000-8000-000000000004','Wi-Fi'),
('50000000-0000-4000-8000-000000000005','Projetor')
on conflict (name) do nothing;

insert into public.room_feature_relations(company_id,room_id,feature_id)
select '10000000-0000-4000-8000-000000000001', room_id, feature_id
from (values
  ('30000000-0000-4000-8000-000000000001'::uuid,'50000000-0000-4000-8000-000000000001'::uuid),
  ('30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000003'),
  ('30000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000004'),
  ('30000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000005'),
  ('30000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000003','50000000-0000-4000-8000-000000000004')
) as relation(room_id, feature_id)
on conflict do nothing;

-- Toda sala reservável precisa de fechadura: `access.provision` falha com
-- `lock_not_found` e vai para revisão manual quando ela não existe.
insert into public.locks(id,company_id,room_id,external_lock_id,gateway_id,name,status)
values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','seed-lock-executiva','seed-gateway-agora','TTLock A-201','offline'),
('60000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','seed-lock-foco','seed-gateway-agora','TTLock B-101','offline'),
('60000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','seed-lock-atelier','seed-gateway-centro','TTLock C-301','offline')
on conflict (provider,external_lock_id) do nothing;
