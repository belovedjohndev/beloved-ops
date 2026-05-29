alter table leads
drop constraint leads_fit_score_valid;

alter table leads
alter column fit_score set default 50;

update leads
set fit_score = fit_score * 20
where fit_score between 1 and 5;

alter table leads
add constraint leads_fit_score_valid check (fit_score between 0 and 100);
