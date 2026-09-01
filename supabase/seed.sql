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
