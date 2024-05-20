import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Ctx, MessagePattern, Payload, RmqContext, Client, ClientProxy } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import axios from 'axios';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Client({ transport: Transport.RMQ, options: { urls: ['amqp://guest:guest@localhost:5672'], queue: 'responseQueue' } })
  client: ClientProxy;

  @MessagePattern('userQueue')
  public async consumeUserQueue(@Payload() data: any, @Ctx() context: RmqContext) {
    const username = data;
    try {
      const userResponse = await axios.get(`https://api.github.com/users/${username}`);
      const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos`);

      const result = {
        id: userResponse.data.id,
        login: userResponse.data.login,
        avatar_url: userResponse.data.avatar_url,
        name: userResponse.data.name,
        location: userResponse.data.location,
        repos: reposResponse.data.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          html_url: repo.html_url,
          description: repo.description,
          fork: repo.fork,
          url: repo.url,
          created_at: repo.created_at,
          updated_at: repo.updated_at,
          pushed_at: repo.pushed_at,
          language: repo.language,
          forks_count: repo.forks_count,
          open_issues_count: repo.open_issues_count,
        }))
      };

      console.log(result)
      this.client.emit('userResponse', result);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        this.client.emit('userResponse', { error: 'User not found' });
      } else {
        this.client.emit('userResponse', { error: 'An error occurred' });
      }
    }
  }
}