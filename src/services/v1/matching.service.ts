import { AppDataSource } from '../../config/db.config.js';
import { User, UserRole } from '../../models/User.js';

interface MatchProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  description: string;
  interests: string[];
  avatarUrl: string;
}

class MatchingService {
  private userRepository = AppDataSource.getRepository(User);

  async getSmartMatches(userId: string, userRole: string): Promise<MatchProfile[]> {
    try {
      let potentialMatches: User[];

      // Find potential matches based on user role
      if (userRole.toLowerCase() === 'farmer') {
        // Farmers match with buyers and investors
        potentialMatches = await this.userRepository.find({
          where: [
            { role: UserRole.CUSTOMER }, // buyers
            { role: UserRole.INVESTOR },
          ],
        });
      } else if (userRole.toLowerCase() === 'investor') {
        // Investors match with farmers
        potentialMatches = await this.userRepository.find({
          where: { role: UserRole.FARMER },
        });
      } else {
        // Buyers match with farmers
        potentialMatches = await this.userRepository.find({
          where: { role: UserRole.FARMER },
        });
      }

      // Convert to match profiles (simplified for now)
      const matches: MatchProfile[] = potentialMatches
        .filter(user => user.id !== userId) // Exclude self
        .slice(0, 10) // Limit results
        .map(user => ({
          id: user.id,
          name: this.getUserName(user),
          role: user.role,
          location: this.getUserLocation(user),
          description: this.getDefaultDescription(user.role),
          interests: this.getDefaultInterests(user.role),
          avatarUrl: '',
        }));

      return matches;
    } catch (error) {
      console.error('Error getting smart matches:', error);
      return [];
    }
  }

  private getUserName(user: User): string {
    if (user.profile && typeof user.profile === 'object' && 'name' in user.profile) {
      return user.profile.name as string;
    }
    return user.email.split('@')[0];
  }

  private getUserLocation(user: User): string {
    if (user.location) {
      return `${user.location.latitude}, ${user.location.longitude}`;
    }
    return 'Location not specified';
  }

  async sendMatchRequest(fromUserId: string, toUserId: string, matchType: string): Promise<boolean> {
    try {
      // For now, just log the request
      // In production, you'd create a match request record in the database
      console.log(`Match request from ${fromUserId} to ${toUserId} (${matchType})`);

      // TODO: Implement actual match request logic
      // - Create match request record
      // - Send notification to target user
      // - Handle acceptance/rejection

      return true;
    } catch (error) {
      console.error('Error sending match request:', error);
      return false;
    }
  }

  private getDefaultDescription(role: string): string {
    switch (role.toLowerCase()) {
      case 'farmer':
        return 'Experienced farmer looking for new opportunities and partnerships.';
      case 'customer':
        return 'Looking for fresh, locally sourced agricultural products.';
      case 'investor':
        return 'Investing in sustainable agriculture and innovative farming solutions.';
      default:
        return 'Active user in the farming community.';
    }
  }

  private getDefaultInterests(role: string): string[] {
    switch (role.toLowerCase()) {
      case 'farmer':
        return ['Sustainable Farming', 'Crop Management', 'Livestock Care'];
      case 'customer':
        return ['Organic Produce', 'Local Sourcing', 'Fresh Products'];
      case 'investor':
        return ['Agriculture Investment', 'Sustainable Practices', 'Innovation'];
      default:
        return ['Farming Community'];
    }
  }
}

export const matchingService = new MatchingService();