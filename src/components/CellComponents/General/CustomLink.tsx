
import React from 'react';
import styled from 'styled-components';

const StyledLink = styled.a`
  // ... (styles)
`;

interface CustomLinkProps {
  href: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}

const CustomLink: React.FC<CustomLinkProps> = ({ href, target, rel, children }) => {
  return (
    <StyledLink href={href} target={target} rel={rel}
    style={{ display: 'block', textDecoration:"underline", color: 'blue', height: '100%' }}>
      {children}
    </StyledLink>
  );
};

export default CustomLink;