/*
 * Copyright (c) 2024. Permar AI Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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

create table if not exists collections
(
    -- Properties
    id          uuid unique not null,
    name        text unique not null,
    description text,

    -- Keys
    primary key (id)
);
create index if not exists idx_name on collections (name);

-- --------------------------------------------------- RELATIONS ---------------------------------------------------- --
create table if not exists team_users
(
    -- Properties
    team_id uuid not null,
    user_id uuid not null,

    -- Keys
    primary key (team_id, user_id),
    constraint fk_team foreign key (team_id) references teams on delete cascade,
    constraint fk_user foreign key (user_id) references users on delete cascade
);
create index if not exists idx_user on team_users (user_id, team_id);

create table if not exists collection_files
(
    -- Properties
    collection_id uuid not null,
    file_id       uuid not null,

    -- Keys
    primary key (collection_id, file_id),
    constraint fk_collection foreign key (collection_id) references collections on delete cascade,
    constraint fk_file foreign key (file_id) references files on delete cascade
);
create index if not exists idx_file on collection_files (file_id, collection_id);

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

create table if not exists collection_users
(
    -- Properties
    collection_id uuid not null,
    user_id       uuid not null,

    -- Keys
    primary key (collection_id, user_id),
    constraint fk_collection foreign key (collection_id) references collections on delete cascade,
    constraint fk_user foreign key (user_id) references users on delete cascade
);
create index if not exists idx_user on collection_users (user_id, collection_id);

create table if not exists collection_teams
(
    -- Properties
    collection_id uuid not null,
    team_id       uuid not null,

    -- Keys
    primary key (collection_id, team_id),
    constraint fk_collection foreign key (collection_id) references collections on delete cascade,
    constraint fk_team foreign key (team_id) references teams on delete cascade
);
create index if not exists idx_team on collection_teams (team_id, collection_id);

-- ----------------------------------------------------- VIEWS ------------------------------------------------------ --
create view if not exists team_users_view as
select t.id          as team_id,
       u.id          as user_id,
       t.name        as team,
       u.email       as user
from team_users tu
         join
     users u on tu.user_id = u.id
         join
     teams t on tu.team_id = t.id;

create view if not exists collection_files_view as
select c.id          as collection_id,
       f.id          as file_id,
       c.name        as collection,
       f.path        as file
from collection_files cf
         join
     collections c on cf.collection_id = c.id
         join
     files f on cf.file_id = f.id;

create view if not exists file_access_view as
-- Relation file-user
select f.id    as file_id,
       u.id    as user_id,
       'user'  as access_type,
       f.path  as file,
       u.email as user,
       null    as team,
       null    as collection
from file_users fu
         join
     users u on fu.user_id = u.id
         join
     files f on fu.file_id = f.id
-- Relation file-team-user
union
select f.id    as file_id,
       u.id    as user_id,
       'team'  as access_type,
       f.path  as file,
       u.email as user,
       t.name  as team,
       null    as collection
from file_teams ft
         join
     team_users tu on ft.team_id = tu.team_id
         join
     teams t on tu.team_id = t.id
         join
     users u on tu.user_id = u.id
         join
     files f on ft.file_id = f.id
-- Relation file-collection-user
union
select f.id         as file_id,
       u.id         as user_id,
       'collection' as access_type,
       f.path       as file,
       u.email      as user,
       null         as team,
       c.name       as collection
from files f
         join
     collection_files cf on cf.file_id = f.id
         join
     collection_users cu on cu.collection_id = cf.collection_id
         join
     collections c on c.id = cf.collection_id
         join
     users u on cu.user_id = u.id
-- Relation file-collection-team-user
union
select f.id              as file_id,
       u.id              as user_id,
       'collection-team' as access_type,
       f.path            as file,
       u.email           as user,
       t.name            as team,
       c.name            as collection
from files f
         join
     collection_files cf on cf.file_id = f.id
         join
     collection_teams ct on ct.collection_id = cf.collection_id
         join
     collections c on c.id = cf.collection_id
         join
     teams t on ct.team_id = t.id
         join
     team_users tu on tu.team_id = t.id
         join
     users u on tu.user_id = u.id;
