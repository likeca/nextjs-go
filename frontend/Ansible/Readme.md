# Set ANSIBLE_CONFIG Path

```bash
export ANSIBLE_CONFIG=$PWD/ansible.cfg
```

# Before Ansible deploy

2. Add Mac .ssh/authorized_keys
3. Add "Port 2200" to /etc/ssh/sshd_config
4. Add port 2200 to Security Group
5. Add port 80 to Security Group
6. Add port 433 to Security Group
7. Add bitbucket ssh key or copy id_rsa and id_rsa.pub to new VM
8. git clone git@likeca:likeca/nextjs-be.git to accept ssh key

# Generate ssh key

```bash
ssh-keygen -t rsa -b 2048
```

# Ping

```bash
ansible -i inventories/oci/hosts nextjs -m ping -u ubuntu
```

# Ansible for nextjs Project

```bash
# deploy target in "- hosts: production"  [production] define in inventories/oci/hosts
# deploy all roles in playbook
ansible-playbook -i inventories/oci playbooks/oci-nextjs.yml

# deploy only one role
ansible-playbook -i inventories/oci playbooks/common
```

# Ubuntu uninstall Postgresql 10

```bash
$ sudo apt-get --purge remove postgresql-10 postgresql-client-10 postgresql-server-dev-10

# Renew Letsencrypt certificate
$ sudo rm -rf /etc/letsencrypt/archive/
$ sudo rm -rf /etc/letsencrypt/live/
$ sudo rm -rf /etc/letsencrypt/renewal/

$ sudo certbot certonly -d rentbnb.ca
Choice 3: Place files in webroot directory (webroot)
$ sudo systemctl restart nginx
```

# Ubuntu Firewall

```bash
sudo ufw status

sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow http
sudo ufw allow https
```
