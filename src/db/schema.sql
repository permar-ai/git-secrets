/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

-- ---------------------------------------------------- METADATA ---------------------------------------------------- --
create table if not exists metadata
(
    -- Properties
    key   text not null,
    value text not null,

    -- Keys
    primary key (key)
);

-- ----------------------------------------------------- TABLES ----------------------------------------------------- --
create table if not exists users
(
    -- Properties
    id    uuid unique not null,
    email text unique not null,
    name  text,

    -- Keys
    primary key (id)
);
create index if not exists idx_email on users (email);

create table if not exists teams
(
    -- Properties
    id          uuid unique not null,
    name        text unique,
    description text,

    -- Keys
    primary key (id)
);
create index if not exists idx_name on teams (name);

create table if not exists team_members
(
    -- Properties
    team_id uuid not null,
    user_id uuid not null,

    -- Keys
    primary key (team_id, user_id),
    constraint fk_team foreign key (team_id) references teams on delete cascade,
    constraint fk_user foreign key (user_id) references users on delete cascade
);
create index if not exists idx_user on team_members (user_id, team_id);

create table if not exists files
(
    -- Properties
    id                 uuid unique not null,
    path               text unique not null,
    contents_signature text        not null,
    access_signature   text        not null,

    -- Keys
    primary key (id)
);
create index if not exists idx_path on files (path);

create table if not exists file_users
(
    -- Properties
    file_id uuid not null,
    user_id uuid not null,

    -- Keys
    primary key (file_id, user_id),
    constraint fk_file foreign key (file_id) references files on delete cascade,
    constraint fk_user foreign key (user_id) references users on delete cascade
);
create index if not exists idx_user on file_users (user_id, file_id);

create table if not exists file_teams
(
    -- Properties
    file_id uuid not null,
    team_id uuid not null,

    -- Keys
    primary key (file_id, team_id),
    constraint fk_file foreign key (file_id) references files on delete cascade,
    constraint fk_team foreign key (team_id) references teams on delete cascade
);
create index if not exists idx_team on file_teams (team_id, file_id);

-- ----------------------------------------------------- VIEWS ------------------------------------------------------ --
create view if not exists team_members_view as
select t.id    as team_id,
       u.id    as user_id,
       t.name  as team,
       u.email as email,
       u.name  as name
from team_members tu
         join
     users u on tu.user_id = u.id
         join
     teams t on tu.team_id = t.id;

create view if not exists files_access_view as
select f.id    as file_id,
       u.id    as user_id,
       f.path  as path,
       u.email as email,
       u.name  as name,
       'user'  as access_type,
       null    as team
from file_users fu
         join
     users u on fu.user_id = u.id
         join
     files f on fu.file_id = f.id
union
select f.id    as file_id,
       u.id    as user_id,
       f.path  as path,
       u.email as email,
       u.name  as name,
       'team'  as access_type,
       t.name  as team
from file_teams ft
         join
     team_members tm on ft.team_id = tm.team_id
         join
     users u on tm.user_id = u.id
         join
     teams t on tm.team_id = t.id
         join
     files f on ft.file_id = f.id;
